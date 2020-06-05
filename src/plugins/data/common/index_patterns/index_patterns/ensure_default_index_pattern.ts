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

import { contains } from 'lodash';
// import React from 'react';
// import { History } from 'history';
// import { i18n } from '@kbn/i18n';
// import { EuiCallOut } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
// import { toMountPoint } from '../../../../kibana_react/public';
import { IndexPatternsContract } from './index_patterns';

// export type EnsureDefaultIndexPattern = (history: History) => Promise<unknown> | undefined;

export type EnsureDefaultIndexPattern = () => Promise<unknown> | undefined;

export const createEnsureDefaultIndexPattern = (
  core: CoreStart,
  onRedirectNoIndexPattern: (core: CoreStart) => void
) => {
  // let bannerId: string;
  // let timeoutId: NodeJS.Timeout | undefined;

  /**
   * Checks whether a default index pattern is set and exists and defines
   * one otherwise.
   *
   * If there are no index patterns, redirect to management page and show
   * banner. In this case the promise returned from this function will never
   * resolve to wait for the URL change to happen.
   */
  return async function ensureDefaultIndexPattern(this: IndexPatternsContract) {
    const patterns = await this.getIds();
    let defaultId = core.uiSettings.get('defaultIndex');
    let defined = !!defaultId;
    const exists = contains(patterns, defaultId);

    if (defined && !exists) {
      core.uiSettings.remove('defaultIndex');
      defaultId = defined = false;
    }

    if (defined) {
      return;
    }

    // If there is any index pattern created, set the first as default
    if (patterns.length >= 1) {
      defaultId = patterns[0];
      core.uiSettings.set('defaultIndex', defaultId);
    } else {
      onRedirectNoIndexPattern(core);

      // return never-resolving promise to stop resolving and wait for the url change
      return new Promise(() => {});
    }
  };
};
