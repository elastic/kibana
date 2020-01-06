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

import { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../context';

/**
 * Returns the current UI-settings value.
 *
 * Usage:
 *
 * ```js
 * const darkMode = useUiSetting('theme:darkMode');
 * ```
 */
export const useUiSetting = <T>(key: string, defaultValue?: T): T => {
  const { services } = useKibana();

  if (typeof services.uiSettings !== 'object') {
    throw new TypeError('uiSettings service not available in kibana-react context.');
  }

  return services.uiSettings.get(key, defaultValue);
};

type Setter<T> = (newValue: T) => Promise<boolean>;

/**
 * Returns a 2-tuple, where first entry is the setting value and second is a
 * function to update the setting value.
 *
 * Synchronously returns the most current value of the setting and subscribes
 * to all subsequent updates, which will re-render your component on new values.
 *
 * Usage:
 *
 * ```js
 * const [darkMode, setDarkMode] = useUiSetting$('theme:darkMode');
 * ```
 */
export const useUiSetting$ = <T>(key: string, defaultValue?: T): [T, Setter<T>] => {
  const { services } = useKibana();

  if (typeof services.uiSettings !== 'object') {
    throw new TypeError('uiSettings service not available in kibana-react context.');
  }

  const observable$ = useMemo(() => services.uiSettings!.get$(key, defaultValue), [
    key,
    defaultValue,
    services.uiSettings,
  ]);
  const value = useObservable<T>(observable$, services.uiSettings!.get(key, defaultValue));
  const set = useCallback((newValue: T) => services.uiSettings!.set(key, newValue), [key]);

  return [value, set];
};
