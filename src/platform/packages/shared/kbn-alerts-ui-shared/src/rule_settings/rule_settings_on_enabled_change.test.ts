/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RulesSettingsFlapping } from '@kbn/alerting-types';
import { getOnEnabledChange } from './rule_settings_on_enabled_change';

describe('getExecutionDurationPercentiles', () => {
  it('return changes when global flapping.enabled: true and enabled: true', () => {
    const changes = getOnEnabledChange({
      enabled: true,
      spaceFlappingSettings: {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      } as RulesSettingsFlapping,
    });
    expect(changes).toEqual({ custom: false, flappingChange: null });
  });

  it('return changes when global flapping.enabled: false and enabled: false', () => {
    const changes = getOnEnabledChange({
      enabled: false,
      spaceFlappingSettings: {
        enabled: false,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      } as RulesSettingsFlapping,
    });
    expect(changes).toEqual({ custom: false, flappingChange: null });
  });

  it('return changes when global flapping.enabled: true and enabled: false', () => {
    const changes = getOnEnabledChange({
      enabled: false,
      spaceFlappingSettings: {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      } as RulesSettingsFlapping,
    });
    expect(changes).toEqual({
      custom: true,
      hide: false,
      flappingChange: {
        enabled: false,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
    });
  });

  it('return changes when global flapping.enabled: false and enabled: true', () => {
    const changes = getOnEnabledChange({
      enabled: true,
      spaceFlappingSettings: {
        enabled: false,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      } as RulesSettingsFlapping,
    });
    expect(changes).toEqual({
      custom: true,
      hide: true,
      flappingChange: {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
    });
  });

  it('return changes with flappingSettings when global flapping.enabled != enabled', () => {
    const changes = getOnEnabledChange({
      enabled: true,
      spaceFlappingSettings: {
        enabled: false,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      } as RulesSettingsFlapping,
      flappingSettings: {
        lookBackWindow: 10,
        statusChangeThreshold: 2,
      },
      cachedFlappingSettings: {
        lookBackWindow: 13,
        statusChangeThreshold: 5,
      },
    });
    expect(changes).toEqual({
      custom: true,
      hide: true,
      flappingChange: {
        enabled: true,
        lookBackWindow: 10,
        statusChangeThreshold: 2,
      },
    });
  });

  it('return changes with cachedFlappingSettings when global flapping.enabled != enabled', () => {
    const changes = getOnEnabledChange({
      enabled: true,
      spaceFlappingSettings: {
        enabled: false,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      } as RulesSettingsFlapping,
      cachedFlappingSettings: {
        lookBackWindow: 13,
        statusChangeThreshold: 5,
      },
    });
    expect(changes).toEqual({
      custom: true,
      hide: true,
      flappingChange: {
        enabled: true,
        lookBackWindow: 13,
        statusChangeThreshold: 5,
      },
    });
  });
});
