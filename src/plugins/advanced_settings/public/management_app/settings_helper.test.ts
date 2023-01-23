/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PublicUiSettingsParams,
  UiSettingsType,
  UserProvidedValues,
} from '@kbn/core-ui-settings-common';
import { Observable } from 'rxjs';
import { FieldSetting } from './types';
import { mapConfig, mapSettings, initCategoryCounts, initCategories } from './settings_helper';

describe('Settings Helper', () => {
  const defaultConfig: Partial<FieldSetting> = {
    displayName: 'defaultName',
    requiresPageReload: false,
    isOverridden: false,
    ariaName: 'ariaName',
    readOnly: false,
    isCustom: false,
    defVal: 'defVal',
    type: 'string' as UiSettingsType,
    category: ['category'],
  };

  const arraySetting = {
    'test:array:setting': {
      ...defaultConfig,
      value: ['default_value'],
      name: 'Test array setting',
      description: 'Description for Test array setting',
      category: ['elasticsearch'],
    },
  };

  const booleanSetting = {
    'test:boolean:setting': {
      ...defaultConfig,
      value: true,
      name: 'Test boolean setting',
      description: 'Description for Test boolean setting',
      category: ['elasticsearch'],
    },
  };

  const imageSetting = {
    'test:image:setting': {
      ...defaultConfig,
      value: null,
      name: 'Test image setting',
      description: 'Description for Test image setting',
      type: 'image' as UiSettingsType,
    },
  };

  const arrayFieldSetting = {
    ariaName: 'Test array setting',
    category: ['elasticsearch'],
    defVal: ['default_value'],
    description: 'Description for Test array setting',
    displayName: 'Test array setting',
    isCustom: false,
    isOverridden: false,
    name: 'test:array:setting',
    readOnly: false,
    requiresPageReload: false,
    type: 'string' as UiSettingsType,
  };

  const booleanFieldSetting = {
    ariaName: 'Test boolean setting',
    category: ['elasticsearch'],
    defVal: true,
    description: 'Description for Test boolean setting',
    displayName: 'Test boolean setting',
    isCustom: false,
    isOverridden: false,
    name: 'test:boolean:setting',
    readOnly: false,
    requiresPageReload: false,
    type: 'string' as UiSettingsType,
  };

  const imageFieldSetting = {
    ariaName: 'Test image setting',
    category: ['category'],
    defVal: null,
    description: 'Description for Test image setting',
    displayName: 'Test image setting',
    isCustom: false,
    isOverridden: false,
    name: 'test:image:setting',
    readOnly: false,
    requiresPageReload: false,
    type: 'image' as UiSettingsType,
  };

  const config = {
    set: (key: string, value: any) => Promise.resolve(true),
    remove: (key: string) => Promise.resolve(true),
    isCustom: (key: string) => false,
    isOverridden: (key: string) => Boolean(config.getAll()[key].isOverridden),
    getRegistered: () => ({} as Readonly<Record<string, PublicUiSettingsParams>>),
    getUpdate$: () =>
      new Observable<{
        key: string;
        newValue: any;
        oldValue: any;
      }>(),
    isDeclared: (key: string) => true,
    isDefault: (key: string) => true,

    getSaved$: () =>
      new Observable<{
        key: string;
        newValue: any;
        oldValue: any;
      }>(),

    getUpdateErrors$: () => new Observable<Error>(),
    get: (key: string, defaultOverride?: any): any => config.getAll()[key] || defaultOverride,
    get$: (key: string) => new Observable<any>(config.get(key)),
    getAll: (): Readonly<Record<string, PublicUiSettingsParams & UserProvidedValues>> => {
      return {
        ...arraySetting,
        ...booleanSetting,
        ...imageSetting,
      };
    },
  };

  it('mapConfig', () => {
    expect(mapConfig(config)).toEqual([arrayFieldSetting, booleanFieldSetting, imageFieldSetting]);
  });

  it('mapSettings, initCategoryCounts and initCategories', () => {
    const fieldSetting1: FieldSetting = { ...arrayFieldSetting, value: ['a', 'b', 'c'] };
    const fieldSetting2: FieldSetting = { ...booleanFieldSetting, value: false };
    const fieldSetting3: FieldSetting = { ...imageFieldSetting, value: 'imageSrc' };
    const mapped = mapSettings([fieldSetting1, fieldSetting2, fieldSetting3]);
    expect(Object.keys(mapped).sort()).toEqual(['category', 'elasticsearch'].sort());
    expect(mapped.category.length).toEqual(1);
    expect(mapped.elasticsearch.length).toEqual(2);

    const categoryCounts = initCategoryCounts(mapped);
    expect(categoryCounts).toEqual({ category: 1, elasticsearch: 2 });

    const categories = initCategories(mapped);
    expect(categories).toEqual(['category', 'elasticsearch']);
  });
});
