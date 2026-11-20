/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeSettingDefinitions } from './merge_setting_definitions';

describe('mergeSettingDefinitions', () => {
  const definition = {
    name: 'Theme',
    description: 'The theme to use',
    type: 'select' as const,
    value: 'light',
    options: ['light', 'dark'],
    optionLabels: { light: 'Light', dark: 'Dark' },
    category: ['appearance'],
    requiresPageReload: true,
  };

  it('keeps display metadata from the definition and values from the runtime state', () => {
    const merged = mergeSettingDefinitions(
      { theme: { ...definition, userValue: 'light' } },
      { theme: { name: 'Theme', type: 'select', value: 'light', userValue: 'dark' } }
    );

    expect(merged).toEqual({ theme: { ...definition, userValue: 'dark' } });
  });

  it('drops the saved value from the definition when the runtime state has none', () => {
    const merged = mergeSettingDefinitions(
      { theme: { ...definition, userValue: 'dark', isOverridden: true } },
      { theme: { name: 'Theme', type: 'select', value: 'light' } }
    );

    expect(merged.theme).not.toHaveProperty('userValue');
    expect(merged.theme).not.toHaveProperty('isOverridden');
  });

  it('returns the definition unchanged when the setting has no runtime state', () => {
    const merged = mergeSettingDefinitions({ theme: { ...definition, userValue: 'dark' } }, {});

    expect(merged).toEqual({ theme: { ...definition, userValue: 'dark' } });
  });

  it('ignores runtime settings that have no definition', () => {
    const merged = mergeSettingDefinitions({}, { theme: { value: 'light' } });

    expect(merged).toEqual({});
  });
});
