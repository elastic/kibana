/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TIME_RANGE_DATA_MODES } from '../../common/enums';
import { findByValueEmbeddables } from '../../../../dashboard/server';

import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsFindResult,
} from '../../../../../core/server';
import type { SavedVisState } from '../../../../visualizations/common';
import type { Panel } from '../../common/types';

export interface TimeseriesUsage {
  timeseries_use_last_value_mode_total: number;
  timeseries_table_use_aggregate_function: number;
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

export const getStats = async (
  soClient: SavedObjectsClientContract | ISavedObjectsRepository
): Promise<TimeseriesUsage | undefined> => {
  const timeseriesUsage = {
    timeseries_use_last_value_mode_total: 0,
    timeseries_table_use_aggregate_function: 0,
  };

  function telemetryUseLastValueMode(visState: SavedVisState<Panel>) {
    if (
      visState.type === 'metrics' &&
      visState.params.type !== 'timeseries' &&
      (!visState.params.time_range_mode ||
        visState.params.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE)
    ) {
      timeseriesUsage.timeseries_use_last_value_mode_total++;
    }
  }

  function telemetryTableAggFunction(visState: SavedVisState<Panel>) {
    if (
      visState.type === 'metrics' &&
      visState.params.type === 'table' &&
      visState.params.series &&
      visState.params.series.length > 0
    ) {
      const usesAggregateFunction = visState.params.series.some(
        (s) => s.aggregate_by && s.aggregate_function
      );
      if (usesAggregateFunction) {
        timeseriesUsage.timeseries_table_use_aggregate_function++;
      }
    }
  }

  await Promise.all([
    // last value usage telemetry
    doTelemetryFoVisualizations(soClient, telemetryUseLastValueMode),
    doTelemetryForByValueVisualizations(soClient, telemetryUseLastValueMode),
    //  table aggregate function telemetry
    doTelemetryFoVisualizations(soClient, telemetryTableAggFunction),
    doTelemetryForByValueVisualizations(soClient, telemetryTableAggFunction),
  ]);

  return timeseriesUsage.timeseries_use_last_value_mode_total ||
    timeseriesUsage.timeseries_table_use_aggregate_function
    ? timeseriesUsage
    : undefined;
};
