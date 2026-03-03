/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { EMPTY, map, type Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

/** Whether the app menu observable has items configured */
export function useHasAppMenuConfig(
  appMenu$: Observable<AppMenuConfig | undefined> | undefined
): boolean {
  const hasConfig$ = useMemo(
    () =>
      appMenu$?.pipe(map((config) => !!config && !!config.items && config.items.length > 0)) ??
      EMPTY,
    [appMenu$]
  );
  return useObservable(hasConfig$, false);
}
