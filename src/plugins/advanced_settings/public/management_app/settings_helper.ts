/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DEFAULT_CATEGORY, fieldSorter, toEditableConfig } from './lib';
import { FieldSetting } from './types';
import { GroupedSettings } from './settings';

export const mapConfig = (config: IUiSettingsClient) => {
  const all = config.getAll();
  return Object.entries(all)
    .map(([settingId, settingDef]) => {
      return toEditableConfig({
        def: settingDef,
        name: settingId,
        value: settingDef.userValue,
        isCustom: config.isCustom(settingId),
        isOverridden: config.isOverridden(settingId),
      });
    })
    .filter((c) => !c.readOnly)
    .filter((c) => !c.isCustom) // hide any settings that aren't explicitly registered by enabled plugins.
    .sort(fieldSorter);
};

export const mapSettings = (fieldSettings: FieldSetting[]) => {
  // Group settings by category
  return fieldSettings.reduce((grouped: GroupedSettings, setting) => {
    // We will want to change this logic when we put each category on its
    // own page aka allowing a setting to be included in multiple categories.
    const category = setting.category[0];
    (grouped[category] = grouped[category] || []).push(setting);
    return grouped;
  }, {});
};

export const initCategoryCounts = (grouped: GroupedSettings) => {
  return Object.keys(grouped).reduce((counts: Record<string, number>, category: string) => {
    counts[category] = grouped[category].length;
    return counts;
  }, {});
};

export const initCategories = (grouped: GroupedSettings) => {
  return Object.keys(grouped).sort((a, b) => {
    if (a === DEFAULT_CATEGORY) return -1;
    if (b === DEFAULT_CATEGORY) return 1;
    if (a > b) return 1;
    return a === b ? 0 : -1;
  });
};
