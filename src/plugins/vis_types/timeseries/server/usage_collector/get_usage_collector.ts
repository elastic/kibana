/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findByValueEmbeddables } from '@kbn/dashboard-plugin/server';

import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { SavedVisState } from '@kbn/visualizations-plugin/common';
import { TIME_RANGE_DATA_MODES } from '../../common/enums';
import type { Panel } from '../../common/types';

export interface TimeseriesUsage {
  timeseries_use_last_value_mode_total: number;
  timeseries_use_es_indices_total: number;
  timeseries_table_use_aggregate_function: number;
  timeseries_types: {
    table: number;
    gauge: number;
    markdown: number;
    top_n: number;
    timeseries: number;
    metric: number;
  };
}

const doTelemetryFoVisualizations = async (
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
  calculateTelemetry: (savedVis: SavedVisState<Panel>) => void
) => {
  const finder = await soClient.createPointInTimeFinder({
    type: 'visualization',
    perPage: 1000,
    namespaces: ['*'],
  });

  for await (const response of finder.find()) {
    (response.saved_objects || []).forEach(({ attributes }: SavedObjectsFindResult<any>) => {
      if (attributes?.visState) {
        try {
          const visState: SavedVisState<Panel> = JSON.parse(attributes.visState);

          calculateTelemetry(visState);
        } catch {
          // nothing to be here, "so" not valid
        }
      }
    });
  }
  await finder.close();
};

const doTelemetryForByValueVisualizations = async (
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
  telemetryUseLastValueMode: (savedVis: SavedVisState<Panel>) => void
) => {
  const byValueVisualizations = await findByValueEmbeddables(soClient, 'visualization');

  for (const item of byValueVisualizations) {
    telemetryUseLastValueMode(item.savedVis as unknown as SavedVisState<Panel>);
  }
};

const getDefaultTSVBVisualizations = (home?: HomeServerPluginSetup) => {
  const titles: string[] = [];
  const sampleDataSets = home?.sampleData.getSampleDatasets() ?? [];

  sampleDataSets.forEach((sampleDataSet) =>
    sampleDataSet.savedObjects.forEach((savedObject) => {
      try {
        if (savedObject.type === 'visualization') {
          const visState = JSON.parse(savedObject.attributes?.visState);

          if (visState.type === 'metrics') {
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
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
  home?: HomeServerPluginSetup
): Promise<TimeseriesUsage | undefined> => {
  const timeseriesUsage = {
    timeseries_use_last_value_mode_total: 0,
    timeseries_use_es_indices_total: 0,
    timeseries_table_use_aggregate_function: 0,
    timeseries_types: {
      gauge: 0,
      markdown: 0,
      metric: 0,
      table: 0,
      timeseries: 0,
      top_n: 0,
    },
  };

  // we want to exclude the TSVB Sample Data visualizations from the stats
  // in order to have more accurate results
  const excludedFromStatsVisualizations = getDefaultTSVBVisualizations(home);

  function telemetryUseLastValueMode(visState: SavedVisState<Panel>) {
    if (
      visState.type === 'metrics' &&
      visState.params.type !== 'timeseries' &&
      (!visState.params.time_range_mode ||
        visState.params.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE) &&
      !excludedFromStatsVisualizations.includes(visState.title)
    ) {
      timeseriesUsage.timeseries_use_last_value_mode_total++;
    }
  }

  function telemetryUseESIndices(visState: SavedVisState<Panel>) {
    if (
      visState.type === 'metrics' &&
      !visState.params.use_kibana_indexes &&
      !excludedFromStatsVisualizations.includes(visState.title)
    ) {
      timeseriesUsage.timeseries_use_es_indices_total++;
    }
  }

  function telemetryTableAggFunction(visState: SavedVisState<Panel>) {
    if (
      visState.type === 'metrics' &&
      visState.params.type === 'table' &&
      visState.params.series &&
      visState.params.series.length > 0 &&
      !excludedFromStatsVisualizations.includes(visState.title)
    ) {
      const usesAggregateFunction = visState.params.series.some(
        (s) => s.aggregate_by && s.aggregate_function
      );
      if (usesAggregateFunction) {
        timeseriesUsage.timeseries_table_use_aggregate_function++;
      }
    }
  }

  function telemetryPanelTypes(visState: SavedVisState<Panel>) {
    if (visState.type === 'metrics' && !excludedFromStatsVisualizations.includes(visState.title)) {
      timeseriesUsage.timeseries_types[visState.params.type]++;
    }
  }
  await Promise.all([
    // last value usage telemetry
    doTelemetryFoVisualizations(soClient, telemetryUseLastValueMode),
    doTelemetryForByValueVisualizations(soClient, telemetryUseLastValueMode),
    // elasticsearch indices usage telemetry
    doTelemetryFoVisualizations(soClient, telemetryUseESIndices),
    doTelemetryForByValueVisualizations(soClient, telemetryUseESIndices),
    //  table aggregate function telemetry
    doTelemetryFoVisualizations(soClient, telemetryTableAggFunction),
    doTelemetryForByValueVisualizations(soClient, telemetryTableAggFunction),
    //  panel types usage telemetry
    doTelemetryFoVisualizations(soClient, telemetryPanelTypes),
    doTelemetryForByValueVisualizations(soClient, telemetryPanelTypes),
  ]);

  return timeseriesUsage.timeseries_use_last_value_mode_total ||
    timeseriesUsage.timeseries_use_es_indices_total ||
    timeseriesUsage.timeseries_table_use_aggregate_function ||
    Object.values(timeseriesUsage.timeseries_types).some((visualizationCount) => visualizationCount)
    ? timeseriesUsage
    : undefined;
};
