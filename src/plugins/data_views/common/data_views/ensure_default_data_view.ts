/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsContract } from './data_views';
import { UiSettingsCommon } from '../types';

export type EnsureDefaultDataView = () => Promise<unknown> | undefined;

export const createEnsureDefaultDataView = (
  uiSettings: UiSettingsCommon,
  onRedirectNoDefaultView: () => Promise<unknown> | void
) => {
  /**
   * Checks whether a default data view is set and exists and defines
   * one otherwise.
   */
  return async function ensureDefaultDataView(this: DataViewsContract) {
    if (!(await this.getDefaultDataView())) {
      return onRedirectNoDefaultView();
    }
  };
};
