/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

export type UseBooleanUrlStateResult = [boolean, (next: boolean) => void];

const readParam = (search: string, paramName: string): boolean =>
  new URLSearchParams(search).get(paramName) === 'true';

/**
 * Binds a boolean value to a URL query parameter via the app's scoped history so
 * browser Back/Forward navigation restores the value. Must be called inside a `<Router>`.
 *
 * Opening (true) pushes a history entry so Back closes; closing (false) replaces the
 * entry and removes the param from the URL.
 */
export const useBooleanUrlState = (paramName: string): UseBooleanUrlStateResult => {
  const history = useHistory();

  // React hooks must register unconditionally on every render. If history is missing, initial value is false.
  const [value, setValue] = useState<boolean>(() =>
    history ? readParam(history.location.search, paramName) : false
  );

  useEffect(() => {
    if (!history) return;
    setValue(readParam(history.location.search, paramName));
    return history.listen((location) => {
      setValue(readParam(location.search, paramName));
    });
  }, [history, paramName]);

  const setUrlValue = useCallback(
    (next: boolean) => {
      if (!history) return;
      const params = new URLSearchParams(history.location.search);
      if (next) {
        params.set(paramName, 'true');
      } else {
        params.delete(paramName);
      }
      const serialized = params.toString();
      const target = { ...history.location, search: serialized ? `?${serialized}` : '' };
      if (next) {
        history.push(target);
      } else {
        history.replace(target);
      }
    },
    [history, paramName]
  );

  // If history is missing, this is a misuse of the hook. We must throw after internal hooks are registered.
  if (!history) {
    throw new Error('useBooleanUrlState must be called inside a <Router>.');
  }

  return [value, setUrlValue];
};
