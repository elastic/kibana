/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { sortBy } from 'lodash';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { isRumOrMobileAgentName, isEDOTAgentName } from '@kbn/elastic-agent-utils';
import { booleanRt } from '../runtime_types/boolean_rt';
import { getIntegerRt } from '../runtime_types/integer_rt';
import { floatThreeDecimalPlacesRt } from '../runtime_types/float_three_decimal_places_rt';
import { floatFourDecimalPlacesRt } from '../runtime_types/float_four_decimal_places_rt';
import type { RawSettingDefinition, SettingDefinition } from './types';
import { generalSettings } from './general_settings';
import { javaSettings } from './java_settings';
import { edotSDKSettings } from './edot_sdk_settings';
import { mobileSettings } from './mobile_settings';
import { getDurationRt } from '../runtime_types/duration_rt';
import { getBytesRt } from '../runtime_types/bytes_rt';
import { getStorageSizeRt } from '../runtime_types/storage_size_rt';

function getSettingDefaults(setting: RawSettingDefinition): SettingDefinition {
  switch (setting.type) {
    case 'select':
      return { validation: t.string, ...setting };

    case 'boolean':
      return { validation: booleanRt, ...setting };

    case 'text':
      return { validation: t.string, ...setting };

    case 'integer': {
      const { min, max } = setting;

      return {
        validation: getIntegerRt({ min, max }),
        min,
        max,
        ...setting,
      };
    }

    case 'float': {
      if (setting.key === 'transaction_sample_rate' || setting.key === 'sampling_rate') {
        return {
          validation: floatFourDecimalPlacesRt,
          ...setting,
        };
      }
      return {
        validation: floatThreeDecimalPlacesRt,
        ...setting,
      };
    }

    case 'bytes': {
      const units = setting.units ?? ['b', 'kb', 'mb'];
      const min = setting.min ?? '0b';
      const max = setting.max;

      return {
        validation: getBytesRt({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    case 'storageSize': {
      const units = setting.units ?? ['B', 'KB', 'MB', 'GB', 'TB'];
      const min = setting.min ?? '0b';
      const max = setting.max;

      return {
        validation: getStorageSizeRt({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    case 'duration': {
      const units = setting.units ?? ['ms', 's', 'm'];
      const min = setting.min ?? '1ms';
      const max = setting.max;

      return {
        validation: getDurationRt({ min, max }),
        units,
        min,
        ...setting,
      };
    }

    default:
      return setting;
  }
}

export function filterByAgent(agentName?: AgentName) {
  return (setting: SettingDefinition) => {
    // agentName is missing if "All" was selected
    if (!agentName) {
      // options that only apply to certain agents will be filtered out
      if (setting.includeAgents) {
        return false;
      }

      // only options that apply to every agent (ignoring RUM and EDOT) should be returned
      if (setting.excludeAgents) {
        return setting.excludeAgents.every(
          (agent) => isRumOrMobileAgentName(agent) || isEDOTAgentName(agent)
        );
      }

      return true;
    }

    if (setting.includeAgents) {
      return setting.includeAgents.includes(agentName);
    }

    if (setting.excludeAgents) {
      return !setting.excludeAgents.includes(agentName);
    }

    return true;
  };
}

export function validateSetting(setting: SettingDefinition, value: unknown) {
  const result = setting.validation.decode(value);
  const message = PathReporter.report(result)[0];
  const isValid = isRight(result);
  return { isValid, message };
}

export const settingDefinitions: SettingDefinition[] = sortBy(
  [...generalSettings, ...javaSettings, ...mobileSettings, ...edotSDKSettings].map(
    getSettingDefaults
  ),
  'key'
);
