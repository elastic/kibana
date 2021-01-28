/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse } from 'hjson';
import { SearchResponse } from 'elasticsearch';
import { ElasticsearchClient, SavedObject } from 'src/core/server';

import { VegaSavedObjectAttributes, VisTypeVegaPluginSetupDependencies } from '../types';

type UsageCollectorDependencies = Pick<VisTypeVegaPluginSetupDependencies, 'home'>;

type ESResponse = SearchResponse<{ visualization: { visState: string } }>;
type VegaType = 'vega' | 'vega-lite';

function isVegaType(attributes: any): attributes is VegaSavedObjectAttributes {
  return attributes && attributes.type === 'vega' && attributes.params?.spec;
}

const checkVegaSchemaType = (schemaURL: string, type: VegaType) =>
  schemaURL.includes(`//vega.github.io/schema/${type}/`);

const getDefaultVegaVisualizations = (home: UsageCollectorDependencies['home']) => {
  const titles: string[] = [];
  const sampleDataSets = home?.sampleData.getSampleDatasets() ?? [];

  sampleDataSets.forEach((sampleDataSet) =>
    sampleDataSet.savedObjects.forEach((savedObject: SavedObject<any>) => {
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

export interface VegaUsage {
  vega_lib_specs_total: number;
  vega_lite_lib_specs_total: number;
  vega_use_map_total: number;
}

export const getStats = async (
  esClient: ElasticsearchClient,
  index: string,
  { home }: UsageCollectorDependencies
): Promise<VegaUsage | undefined> => {
  let shouldPublishTelemetry = false;

  const vegaUsage = {
    vega_lib_specs_total: 0,
    vega_lite_lib_specs_total: 0,
    vega_use_map_total: 0,
  };

  const searchParams = {
    size: 10000,
    index,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id', 'hits.hits._source.visualization'],
    body: {
      query: {
        bool: {
          filter: { term: { type: 'visualization' } },
        },
      },
    },
  };

  const { body: esResponse } = await esClient.search<ESResponse>(searchParams);
  const size = esResponse?.hits?.hits?.length ?? 0;

  if (!size) {
    return;
  }

  // we want to exclude the Vega Sample Data visualizations from the stats
  // in order to have more accurate results
  const excludedFromStatsVisualizations = getDefaultVegaVisualizations(home);
  for (const hit of esResponse.hits.hits) {
    const visualization = hit._source?.visualization;
    const visState = JSON.parse(visualization?.visState ?? '{}');

    if (isVegaType(visState) && !excludedFromStatsVisualizations.includes(visState.title)) {
      try {
        const spec = parse(visState.params.spec, { legacyRoot: false });

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
    }
  }

  return shouldPublishTelemetry ? vegaUsage : undefined;
};
