/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/public';
import { Observable } from 'rxjs';

export const uiSettings: IUiSettingsClient = {
  set: (key: string, value: any) => Promise.resolve(true),
  remove: (key: string) => Promise.resolve(true),
  isCustom: (key: string) => false,
  isOverridden: (key: string) => Boolean(uiSettings.getAll()[key].isOverridden),
  getUpdate$: () =>
    new Observable<{
      key: string;
      newValue: any;
      oldValue: any;
    }>(),
  isDeclared: (key: string) => true,
  isDefault: (key: string) => true,
  getUpdateErrors$: () => new Observable<Error>(),
  get: (key: string, defaultOverride?: any): any => uiSettings.getAll()[key] || defaultOverride,
  get$: (key: string) => new Observable<any>(uiSettings.get(key)),
  getAll: (): Readonly<Record<string, PublicUiSettingsParams & UserProvidedValues>> => {
    return {};
  },
};
