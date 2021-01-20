/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { includes } from 'lodash';
import { IndexPatternsContract } from './index_patterns';
import { UiSettingsCommon } from '../types';

export type EnsureDefaultIndexPattern = () => Promise<unknown> | undefined;

export const createEnsureDefaultIndexPattern = (
  uiSettings: UiSettingsCommon,
  onRedirectNoIndexPattern: () => Promise<unknown> | void
) => {
  /**
   * Checks whether a default index pattern is set and exists and defines
   * one otherwise.
   */
  return async function ensureDefaultIndexPattern(this: IndexPatternsContract) {
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

    // If there is any index pattern created, set the first as default
    if (patterns.length >= 1) {
      defaultId = patterns[0];
      await uiSettings.set('defaultIndex', defaultId);
    } else {
      return onRedirectNoIndexPattern();
    }
  };
};
