/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { SavedObjectAttributes } from '@kbn/core/server';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import {
  type ControlGroupTelemetry,
  CONTROL_GROUP_TYPE,
  RawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { initializeControlGroupTelemetry } from '@kbn/controls-plugin/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SavedDashboardPanel } from '../../common';
import { TASK_ID, DashboardTelemetryTaskState } from './dashboard_telemetry_collection_task';
export interface DashboardCollectorData {
  panels: {
    total: number;
    by_reference: number;
    by_value: number;
    by_type: {
      [key: string]: {
        total: number;
        by_reference: number;
        by_value: number;
        details: {
          [key: string]: number;
        };
      };
    };
  };
  controls: ControlGroupTelemetry;
}

export const getEmptyDashboardData = (): DashboardCollectorData => ({
  panels: {
    total: 0,
    by_reference: 0,
    by_value: 0,
    by_type: {},
  },
  controls: initializeControlGroupTelemetry({}),
});

export const getEmptyPanelTypeData = () => ({
  total: 0,
  by_reference: 0,
  by_value: 0,
  details: {},
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
        id: panel.id || '',
        type: panel.type,
      },
      collectorData.panels.by_type[type].details
    );
  }
};

export const controlsCollectorFactory =
  (embeddableService: EmbeddablePersistableStateService) =>
  (attributes: SavedObjectAttributes, collectorData: DashboardCollectorData) => {
    const controlGroupAttributes: RawControlGroupAttributes | undefined =
      attributes.controlGroupInput as unknown as RawControlGroupAttributes;
    if (!isEmpty(controlGroupAttributes)) {
      collectorData.controls = embeddableService.telemetry(
        {
          ...controlGroupAttributes,
          type: CONTROL_GROUP_TYPE,
          id: `DASHBOARD_${CONTROL_GROUP_TYPE}`,
        },
        collectorData.controls
      ) as ControlGroupTelemetry;
    }

    return collectorData;
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
    const state = latestTaskState[0].state as DashboardTelemetryTaskState;
    return state.telemetry;
  }

  return getEmptyDashboardData();
}
