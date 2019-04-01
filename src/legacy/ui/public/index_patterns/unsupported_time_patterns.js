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

import { BoundToConfigObjProvider } from '../bound_to_config_obj';

export function IsUserAwareOfUnsupportedTimePatternProvider(Private, $injector) {
  const BoundToConfigObj = Private(BoundToConfigObjProvider);
  const sessionStorage = $injector.get('sessionStorage');

  const HISTORY_STORAGE_KEY = 'indexPatterns:warnAboutUnsupportedTimePatterns:history';
  const FLAGS = new BoundToConfigObj({
    enabled: '=indexPatterns:warnAboutUnsupportedTimePatterns'
  });

  return function isUserAwareOfUnsupportedTimePattern(indexPattern) {
    // The user's disabled the notification. They know about it.
    if (!FLAGS.enabled) {
      return true;
    }

    // We've already told the user.
    const previousIds = sessionStorage.get(HISTORY_STORAGE_KEY) || [];
    if (previousIds.includes(indexPattern.id)) {
      return true;
    }

    // Let's store this for later, so we don't tell the user multiple times.
    sessionStorage.set(HISTORY_STORAGE_KEY, [...previousIds, indexPattern.id]);
    return false;
  };
}
