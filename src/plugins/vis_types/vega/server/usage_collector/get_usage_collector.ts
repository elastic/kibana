/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from 'hjson';

import type { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import type { SavedVisState } from '@kbn/visualizations-plugin/common';
import type { VegaSavedObjectAttributes, VisTypeVegaPluginSetupDependencies } from '../types';

type UsageCollectorDependencies = Pick<VisTypeVegaPluginSetupDependencies, 'home'>;
type VegaType = 'vega' | 'vega-lite';

export interface VegaUsage {
  vega_lib_specs_total: number;
  vega_lite_lib_specs_total: number;
  vega_use_map_total: number;
}

function isVegaType(attributes: any): attributes is VegaSavedObjectAttributes {
  return attributes && attributes.type === 'vega' && attributes.params?.spec;
}

const checkVegaSchemaType = (schemaURL: string, type: VegaType) =>
  schemaURL.includes(`//vega.github.io/schema/${type}/`);

const getDefaultVegaVisualizations = (home: UsageCollectorDependencies['home']) => {
  const titles: string[] = [];
  const sampleDataSets = home?.sampleData.getSampleDatasets() ?? [];

  sampleDataSets.forEach((sampleDataSet) =>
    sampleDataSet.savedObjects.forEach((savedObject) => {
      try {
        if (savedObject.type === 'visualization') {
          const visState = JSON.parse(savedObject.attributes?.visState);

          if (isVegaType(visState)) {
            titles.push(visState.title);
          }
        }
      } catch (e) {
        // Let it go, visState is invalid and we'll don't need to handle it
      }
    })
  );

  return titles;
};

export const getStats = async (
  soClient: SavedObjectsClientContract,
  { home }: UsageCollectorDependencies
): Promise<VegaUsage | undefined> => {
  let shouldPublishTelemetry = false;

  const vegaUsage = {
    vega_lib_specs_total: 0,
    vega_lite_lib_specs_total: 0,
    vega_use_map_total: 0,
  };

  // we want to exclude the Vega Sample Data visualizations from the stats
  // in order to have more accurate results
  const excludedFromStatsVisualizations = getDefaultVegaVisualizations(home);

  const finder = await soClient.createPointInTimeFinder({
    type: 'visualization',
    perPage: 1000,
    namespaces: ['*'],
  });

  const doTelemetry = ({ params }: SavedVisState) => {
    try {
      const spec = parse(params.spec as string, { legacyRoot: false });

      if (spec) {
        shouldPublishTelemetry = true;

        if (checkVegaSchemaType(spec.$schema, 'vega')) {
          vegaUsage.vega_lib_specs_total++;
        }
        if (checkVegaSchemaType(spec.$schema, 'vega-lite')) {
          vegaUsage.vega_lite_lib_specs_total++;
        }
        if (spec.config?.kibana?.type === 'map') {
          vegaUsage.vega_use_map_total++;
        }
      }
    } catch (e) {
      // Let it go, the data is invalid and we'll don't need to handle it
    }
  };

  for await (const response of finder.find()) {
    (response.saved_objects || []).forEach(({ attributes }: SavedObjectsFindResult<any>) => {
      if (attributes?.visState) {
        try {
          const visState: SavedVisState = JSON.parse(attributes.visState);

          if (isVegaType(visState) && !excludedFromStatsVisualizations.includes(visState.title)) {
            doTelemetry(visState);
          }
        } catch {
          // nothing to be here, "so" not valid
        }
      }
    });
  }
  await finder.close();

  return shouldPublishTelemetry ? vegaUsage : undefined;
};
