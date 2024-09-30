/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import { set } from '@kbn/safer-lodash-set';
import type { ControlGroupSerializedState } from '../../common';
import {
  type SerializableControlGroupState,
  controlGroupSerializedStateToSerializableRuntimeState,
  getDefaultControlGroupState,
} from './control_group_persistence';

export interface ControlGroupTelemetry {
  total: number;
  chaining_system: {
    [key: string]: number;
  };
  label_position: {
    [key: string]: number;
  };
  ignore_settings: {
    [key: string]: number;
  };
  by_type: {
    [key: string]: {
      total: number;
      details: { [key: string]: number };
    };
  };
}

export const initializeControlGroupTelemetry = (
  statsSoFar: Record<string, unknown>
): ControlGroupTelemetry => {
  return {
    total: (statsSoFar?.total as number) ?? 0,
    chaining_system:
      (statsSoFar?.chaining_system as ControlGroupTelemetry['chaining_system']) ?? {},
    ignore_settings:
      (statsSoFar?.ignore_settings as ControlGroupTelemetry['ignore_settings']) ?? {},
    label_position: (statsSoFar?.label_position as ControlGroupTelemetry['label_position']) ?? {},
    by_type: (statsSoFar?.by_type as ControlGroupTelemetry['by_type']) ?? {},
  };
};

const reportChainingSystemInUse = (
  chainingSystemsStats: ControlGroupTelemetry['chaining_system'],
  chainingSystem: SerializableControlGroupState['chainingSystem']
): ControlGroupTelemetry['chaining_system'] => {
  if (!chainingSystem) return chainingSystemsStats;
  if (Boolean(chainingSystemsStats[chainingSystem])) {
    chainingSystemsStats[chainingSystem]++;
  } else {
    chainingSystemsStats[chainingSystem] = 1;
  }
  return chainingSystemsStats;
};

const reportLabelPositionsInUse = (
  labelPositionStats: ControlGroupTelemetry['label_position'],
  labelPosition: SerializableControlGroupState['labelPosition']
): ControlGroupTelemetry['label_position'] => {
  if (!labelPosition) return labelPositionStats;
  if (Boolean(labelPositionStats[labelPosition])) {
    labelPositionStats[labelPosition]++;
  } else {
    labelPositionStats[labelPosition] = 1;
  }
  return labelPositionStats;
};

const reportIgnoreSettingsInUse = (
  settingsStats: ControlGroupTelemetry['ignore_settings'],
  settings: SerializableControlGroupState['ignoreParentSettings']
): ControlGroupTelemetry['ignore_settings'] => {
  if (!settings) return settingsStats;
  for (const [settingKey, settingValue] of Object.entries(settings)) {
    if (settingValue) {
      // only report ignore settings which are turned ON
      const currentValueForSetting = settingsStats[settingKey] ?? 0;
      set(settingsStats, settingKey, currentValueForSetting + 1);
    }
  }
  return settingsStats;
};

const reportControlTypes = (
  controlTypeStats: ControlGroupTelemetry['by_type'],
  panels: SerializableControlGroupState['panels']
): ControlGroupTelemetry['by_type'] => {
  for (const { type } of Object.values(panels)) {
    const currentTypeCount = controlTypeStats[type]?.total ?? 0;
    const currentTypeDetails = controlTypeStats[type]?.details ?? {};

    // here if we need to start tracking details on specific control types, we can call embeddableService.telemetry

    set(controlTypeStats, `${type}.total`, currentTypeCount + 1);
    set(controlTypeStats, `${type}.details`, currentTypeDetails);
  }
  return controlTypeStats;
};

export const controlGroupTelemetry: PersistableStateService['telemetry'] = (
  state,
  stats
): ControlGroupTelemetry => {
  const controlGroupStats = initializeControlGroupTelemetry(stats);
  const controlGroupState = {
    ...getDefaultControlGroupState(),
    ...controlGroupSerializedStateToSerializableRuntimeState(
      state as unknown as ControlGroupSerializedState
    ),
  };
  if (!controlGroupState) return controlGroupStats;

  controlGroupStats.total += Object.keys(controlGroupState?.panels ?? {}).length;

  controlGroupStats.chaining_system = reportChainingSystemInUse(
    controlGroupStats.chaining_system,
    controlGroupState.chainingSystem
  );

  controlGroupStats.label_position = reportLabelPositionsInUse(
    controlGroupStats.label_position,
    controlGroupState.labelPosition
  );

  controlGroupStats.ignore_settings = reportIgnoreSettingsInUse(
    controlGroupStats.ignore_settings,
    controlGroupState.ignoreParentSettings
  );

  controlGroupStats.by_type = reportControlTypes(
    controlGroupStats.by_type,
    controlGroupState.panels
  );

  return controlGroupStats;
};
