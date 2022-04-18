/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from 'lodash';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import {
  ControlGroupTelemetry,
  initializeControlGroupTelemetry,
  RawControlGroupAttributes,
  rawControlGroupAttributesToControlGroupInput,
} from '../../common';
import { ControlGroupInput } from '../../common/control_group/types';

const reportChainingSystemInUse = (
  chainingSystemsStats: ControlGroupTelemetry['chaining_system'],
  chainingSystem: ControlGroupInput['chainingSystem']
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
  labelPosition: ControlGroupInput['controlStyle'] // controlStyle was renamed labelPosition
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
  settings: ControlGroupInput['ignoreParentSettings']
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
  panels: ControlGroupInput['panels']
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
  const controlGroupInput = rawControlGroupAttributesToControlGroupInput(
    state as unknown as RawControlGroupAttributes
  );
  if (!controlGroupInput) return controlGroupStats;

  controlGroupStats.total += Object.keys(controlGroupInput?.panels ?? {}).length;

  controlGroupStats.chaining_system = reportChainingSystemInUse(
    controlGroupStats.chaining_system,
    controlGroupInput.chainingSystem
  );

  controlGroupStats.label_position = reportLabelPositionsInUse(
    controlGroupStats.label_position,
    controlGroupInput.controlStyle
  );

  controlGroupStats.ignore_settings = reportIgnoreSettingsInUse(
    controlGroupStats.ignore_settings,
    controlGroupInput.ignoreParentSettings
  );

  controlGroupStats.by_type = reportControlTypes(
    controlGroupStats.by_type,
    controlGroupInput.panels
  );

  return controlGroupStats;
};
