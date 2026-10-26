/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleSpecificFlappingProperties, RulesSettingsFlapping } from '@kbn/alerting-types';

interface GetOnEnabledChangeParams {
  enabled: boolean;
  spaceFlappingSettings: RulesSettingsFlapping;
  flappingSettings?: RuleSpecificFlappingProperties | null;
  cachedFlappingSettings?: RuleSpecificFlappingProperties;
}

interface GetOnEnabledChangeResult {
  custom: boolean;
  flappingChange: RuleSpecificFlappingProperties | null;
  hide?: boolean;
}

export const getOnEnabledChange = ({
  enabled,
  spaceFlappingSettings,
  flappingSettings,
  cachedFlappingSettings,
}: GetOnEnabledChangeParams): GetOnEnabledChangeResult => {
  if (spaceFlappingSettings.enabled === enabled) {
    return {
      custom: false,
      flappingChange: null,
    };
  }

  const currentFlappingSettings = flappingSettings
    ? flappingSettings
    : cachedFlappingSettings || spaceFlappingSettings;
  return {
    custom: true,
    flappingChange: {
      enabled,
      lookBackWindow: currentFlappingSettings.lookBackWindow,
      statusChangeThreshold: currentFlappingSettings.statusChangeThreshold,
    },
    hide: enabled,
  };
};
