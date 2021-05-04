/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TIME_RANGE_DATA_MODES } from '../../common/timerange_data_modes';
import { findByValueEmbeddables } from '../../../dashboard/server';

import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsFindResult,
} from '../../../../core/server';
import type { SavedVisState } from '../../../visualizations/common';

export interface TimeseriesUsage {
  timeseries_use_last_value_mode_total: number;
}

const doTelemetryFoVisualizations = async (
  soClient: SavedObjectsClientContract | ISavedObjectsRepository,
  telemetryUseLastValueMode: (savedVis: SavedVisState) => void
) => {
  const finder = await soClient.createPointInTimeFinder({
    type: 'visualization',
    perPage: 1000,
  });

  for await (const response of finder.find()) {
    (response.saved_objects || []).forEach(({ attributes }: SavedObjectsFindResult<any>) => {
      if (attributes?.visState) {
        try {
          const visState: SavedVisState = JSON.parse(attributes.visState);

          telemetryUseLastValueMode(visState);
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
  telemetryUseLastValueMode: (savedVis: SavedVisState) => void
) => {
  const byValueVisualizations = await findByValueEmbeddables(soClient, 'visualization');

  for (const item of byValueVisualizations) {
    telemetryUseLastValueMode(item.savedVis as SavedVisState);
  }
};

export const getStats = async (
  soClient: SavedObjectsClientContract | ISavedObjectsRepository
): Promise<TimeseriesUsage | undefined> => {
  const timeseriesUsage = {
    timeseries_use_last_value_mode_total: 0,
  };

  function telemetryUseLastValueMode(visState: SavedVisState) {
    if (
      visState.type === 'metrics' &&
      visState.params.type !== 'timeseries' &&
      (!visState.params.time_range_mode ||
        visState.params.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE)
    ) {
      timeseriesUsage.timeseries_use_last_value_mode_total++;
    }
  }

  await Promise.all([
    doTelemetryFoVisualizations(soClient, telemetryUseLastValueMode),
    doTelemetryForByValueVisualizations(soClient, telemetryUseLastValueMode),
  ]);

  return timeseriesUsage.timeseries_use_last_value_mode_total ? timeseriesUsage : undefined;
};
