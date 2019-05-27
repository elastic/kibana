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

import * as Rx from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { CoreSetup } from '../types';

export type UiSettingsService = CoreSetup['uiSettings'];

export const createInMemoryUiSettingsService = (): UiSettingsService => {
  const data: Record<string, any> = {};
  const update$ = new Rx.Subject<{ key: string; newValue: any; oldValue: any }>();

  const get: UiSettingsService['get'] = (key, defaultOverride?: any) => {
    const declared = data[key] !== undefined;

    if (!declared && defaultOverride !== undefined) {
      return defaultOverride;
    }
    if (!declared) {
      throw new Error(
        `Unexpected \`config.get("${key}")\` call on unrecognized configuration setting "${key}".
Setting an initial value via \`config.set("${key}", value)\` before attempting to retrieve
any custom setting value for "${key}" may fix this issue.
You can use \`config.get("${key}", defaultValue)\`, which will just return
\`defaultValue\` when the key is unrecognized.`
      );
    }

    return data[key];
  };

  const get$: UiSettingsService['get$'] = (key: string, defaultOverride?: any) => {
    return Rx.concat(
      Rx.defer(() => Rx.of(get(key, defaultOverride))),
      update$.pipe(
        filter(update => update.key === key),
        map(() => get(key, defaultOverride))
      )
    );
  };

  const set: UiSettingsService['set'] = async (key, val) => {
    const oldValue = data[key];
    data[key] = val;
    update$.next({ key, newValue: val, oldValue });
    return true;
  };

  const service: Partial<UiSettingsService> = {
    set,
    get,
    get$,
  };

  return service as UiSettingsService;
};
