/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LegacyStoredPinnedControlState } from '@kbn/controls-schemas';

import type { SavedDashboardPanel } from '../dashboard_saved_object';
import { TASK_ID } from './dashboard_telemetry_collection_task';
import { emptyState } from './task_state';
import type { DashboardCollectorData, DashboardHit } from './types';

export const getEmptyDashboardData = (): DashboardCollectorData => ({
  panels: {
    total: 0,
    by_reference: 0,
    by_value: 0,
    by_type: {},
  },
  controls: {
    total: 0,
    by_type: {},
  },
  sections: {
    total: 0,
  },
  access_mode: {},
});

export const getEmptyPanelTypeData = () => ({
  total: 0,
  by_reference: 0,
  by_value: 0,
  details: {},
});

export const getEmptyControlTypeData = () => ({
  total: 0,
});

export const collectPanelsByType = (
  panels: SavedDashboardPanel[],
  collectorData: DashboardCollectorData,
  embeddableService: EmbeddablePersistableStateService
) => {
  collectorData.panels.total += panels.length;

  for (const panel of panels) {
    const type = panel.type;
    if (!collectorData.panels.by_type[type]) {
      collectorData.panels.by_type[type] = getEmptyPanelTypeData();
    }
    collectorData.panels.by_type[type].total += 1;
    if (panel.id === undefined) {
      collectorData.panels.by_value += 1;
      collectorData.panels.by_type[type].by_value += 1;
    } else {
      collectorData.panels.by_reference += 1;
      collectorData.panels.by_type[type].by_reference += 1;
    }
    // the following "details" need a follow-up that will actually properly consolidate
    // the data from all embeddables - right now, the only data that is kept is the
    // telemetry for the **final** embeddable of that type
    collectorData.panels.by_type[type].details = embeddableService.telemetry(
      {
        ...panel.embeddableConfig,
        type: panel.type,
      },
      collectorData.panels.by_type[type].details
    );
  }
};

export const collectSectionsAndAccessControl = (
  dashboard: DashboardHit,
  collectorData: DashboardCollectorData
) => {
  if (dashboard.accessControl?.accessMode) {
    const mode = dashboard.accessControl.accessMode;
    collectorData.access_mode[mode] ??= { total: 0 };
    collectorData.access_mode[mode].total += 1;
  }
  collectorData.sections.total += dashboard.attributes.sections?.length ?? 0;
  return collectorData;
};

export const collectPinnedControls = (
  controls: LegacyStoredPinnedControlState,
  collectorData: DashboardCollectorData,
  embeddableService: EmbeddablePersistableStateService
) => {
  const controlValues = Object.values(controls);
  collectorData.controls.total += controlValues.length;

  for (const control of controlValues) {
    const type = control.type;
    if (!collectorData.controls.by_type[type]) {
      collectorData.controls.by_type[type] = getEmptyControlTypeData();
    }
    collectorData.controls.by_type[type].total += 1;
  }
};

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.fetch({
      query: { bool: { filter: { term: { _id: `task:${TASK_ID}` } } } },
    });
    return result.docs;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
        The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
        task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
        initialized (or it will throw a different type of error)
      */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export async function collectDashboardTelemetry(taskManager: TaskManagerStartContract) {
  const latestTaskState = await getLatestTaskState(taskManager);

  if (latestTaskState !== null) {
    const state = latestTaskState[0].state;
    return state.telemetry;
  }

  return emptyState.telemetry;
}
