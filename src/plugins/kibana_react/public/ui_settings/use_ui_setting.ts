/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  if (typeof services.settings !== 'object') {
    throw new TypeError('uiSettings service not available in kibana-react context.');
  }

  return services.settings?.client.get(key, defaultValue);
};

/**
 * Returns the current global UI-settings value.
 *
 * Usage:
 *
 * ```js
 * const customBranding = useGlobalUiSetting('customBranding:pageTitle');
 * ```
 */
export const useGlobalUiSetting = <T>(key: string, defaultValue?: T): T => {
  const { services } = useKibana();

  if (typeof services.settings !== 'object') {
    throw new TypeError('uiSettings service not available in kibana-react context.');
  }

  return services.settings.globalClient.get(key, defaultValue);
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

  if (typeof services.settings !== 'object') {
    throw new TypeError('uiSettings service not available in kibana-react context.');
  }

  const observable$ = useMemo(
    () => services.settings!.client.get$(key, defaultValue),
    [key, defaultValue, services.settings.client]
  );
  const value = useObservable<T>(observable$, services.settings!.client.get(key, defaultValue));
  const set = useCallback((newValue: T) => services.settings!.client.set(key, newValue), [key]);

  return [value, set];
};
