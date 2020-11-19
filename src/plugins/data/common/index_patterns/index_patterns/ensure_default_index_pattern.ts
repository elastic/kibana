/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
