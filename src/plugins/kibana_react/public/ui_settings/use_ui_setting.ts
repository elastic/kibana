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
import { useKibana } from '../core';
import { useObservable } from '../util/use_observable';

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
 * const [darkMode, setDarkMode] = useUiSetting('theme:darkMode');
 * ```
 *
 * @todo As of this writing `uiSettings` service exists only on *setup* `core`
 *       object, but I assume it will be available on *start* `core` object, too,
 *       thus postfix assertion is used `core.uiSetting!`.
 */
export const useUiSetting = <T>(key: string, defaultValue: T): [T, Setter<T>] => {
  const { core } = useKibana();
  const observable$ = useMemo(() => core.uiSettings!.get$(key, defaultValue), [key, defaultValue]);
  const value = useObservable<T>(observable$, core.uiSettings!.get(key, defaultValue));
  const set = useCallback((newValue: T) => core.uiSettings!.set(key, newValue), [key]);

  return [value, set];
};
