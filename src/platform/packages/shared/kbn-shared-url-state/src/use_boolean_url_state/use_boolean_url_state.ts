/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';

export type UseBooleanUrlStateResult = [boolean, (next: boolean) => void];

/**
 * Binds a boolean value to a URL query parameter via the app's scoped history so
 * browser Back/Forward navigation restores the value. Must be called inside a `<Router>`.
 *
 * Opening (true) pushes a history entry so Back closes; closing (false) replaces the
 * entry and removes the param from the URL.
 */
export const useBooleanUrlState = (paramName: string): UseBooleanUrlStateResult => {
  const history = useHistory();

  // Compute storage as null when history is missing so every hook below registers
  // unconditionally on every render. The misuse is surfaced via the throw at the end.
  const urlStateStorage = useMemo(
    () => (history ? createKbnUrlStateStorage({ useHash: false, history }) : null),
    [history]
  );

  const readFromUrl = useCallback(
    () => urlStateStorage?.get<boolean>(paramName) === true,
    [urlStateStorage, paramName]
  );

  const [value, setValue] = useState<boolean>(readFromUrl);

  useEffect(() => {
    if (!urlStateStorage) return;
    const sub = urlStateStorage.change$<boolean>(paramName).subscribe((next) => {
      setValue(next === true);
    });
    return () => sub.unsubscribe();
  }, [urlStateStorage, paramName]);

  const setUrlValue = useCallback(
    (next: boolean) => {
      if (!urlStateStorage) return;
      setValue(next);
      if (next) {
        urlStateStorage.set(paramName, true, { replace: false });
      } else {
        // Remove the key from the hash-query entirely rather than writing rison-null,
        // so the URL stays clean after closing.
        urlStateStorage.kbnUrlControls.updateAsync(
          (currentUrl) =>
            replaceUrlHashQuery(currentUrl, ({ [paramName]: _omit, ...rest }) => rest),
          true
        );
      }
    },
    [urlStateStorage, paramName]
  );

  if (!history) {
    throw new Error('useBooleanUrlState must be called inside a <Router>.');
  }

  return [value, setUrlValue];
};
