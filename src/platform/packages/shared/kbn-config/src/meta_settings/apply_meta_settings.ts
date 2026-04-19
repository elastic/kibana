/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, get, has, merge, unset } from 'lodash';
import { ensureDeepObject } from '@kbn/std';
import { set } from '@kbn/safer-lodash-set';
import type { MetaSetting } from './types';

/**
 * Applies the meta settings to the config.
 * @param config Initial config object.
 * @param metaSettings Map of meta settings to apply.
 * @returns The config object after applying all the relevant meta settings overrides.
 */
export function applyMetaSettings(
  config: Record<string, unknown>,
  metaSettings: Map<string, MetaSetting[]>
) {
  // We don't want to mutate the original config object, so we clone it.
  const result = cloneDeep(config);
  const userConfigWithoutMetaSettings = cloneDeep(config);

  const metaSettingsChanges: { priority: number; changeFn: () => void }[] = [];
  const changes: { priority: number; changeFn: () => void }[] = [];
  // We need to run the meta settings until no changes are made (some meta settings may set other meta settings).
  do {
    // Reset the changes arrays.
    metaSettingsChanges.length = 0;
    changes.length = 0;
    metaSettings.forEach((_metaSettings, setting) => {
      const metaSettingValue = get(result, setting);
      unset(result, setting);
      unset(userConfigWithoutMetaSettings, setting);

      _metaSettings.forEach((metaSetting) => {
        if (isValidMetaSetting(metaSetting, metaSettingValue)) {
          // Apply changes to the meta settings first:
          metaSettings.keys().forEach((key) => {
            if (has(metaSetting.config, key)) {
              metaSettingsChanges.push({
                priority: metaSetting.priority,
                changeFn: () => {
                  set(result, key, get(metaSetting.config, key));
                },
              });
            }
          });

          changes.push({
            priority: metaSetting.priority,
            changeFn: () => {
              // Using `merge` and `ensureDeepObject` to support both: flat and nested config objects.
              merge(result, ensureDeepObject(metaSetting.config));
            },
          });
        }
      });
    });

    if (metaSettingsChanges.length > 0) {
      // Only run the highest priority meta settings change.
      // It might require multiple loops to run all the meta settings changes, but it's the safest way to to cover all the cases.
      // Since we're running this only when evaluating the config (and only if there are meta settings that change other meta settings), the perf impact of the extra loops is minimal.
      metaSettingsChanges.sort((a, b) => b.priority - a.priority)[0]?.changeFn();
    } else {
      changes.sort((a, b) => a.priority - b.priority).forEach((change) => change.changeFn());
    }
  } while (changes.length > 0 || metaSettingsChanges.length > 0);

  // Merge incoming config last to preserve the user's config (without the meta settings).
  return merge(result, userConfigWithoutMetaSettings);
}

function isValidMetaSetting(metaSetting: MetaSetting, value: unknown): boolean {
  try {
    metaSetting.schema.validate(value);
    return true;
  } catch (error) {
    return false;
  }
}
