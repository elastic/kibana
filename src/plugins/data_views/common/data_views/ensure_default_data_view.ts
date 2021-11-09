/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { includes } from 'lodash';
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
    const patterns = await this.getIds();
    let defaultId = await uiSettings.get('defaultIndex');
    let defined = !!defaultId;
    const exists = includes(patterns, defaultId);

    if (defined && !exists) {
      await uiSettings.remove('defaultIndex');
      defaultId = defined = false;
    }

    if (defined) {
      return;
    }

    // If there is any user index pattern created, set the first as default
    // if there is 0 patterns, then don't even call `hasUserDataView()`
    if (patterns.length >= 1 && (await this.hasUserDataView().catch(() => true))) {
      defaultId = patterns[0];
      await uiSettings.set('defaultIndex', defaultId);
    } else {
      return onRedirectNoDefaultView();
    }
  };
};
