/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
export declare const panelIsRelatedByGlobalFilters: <
  const UseGlobalFilters$ extends Observable<boolean | undefined>
>(
  useGlobalFilters$: UseGlobalFilters$
) => {
  dependentObservables: readonly [UseGlobalFilters$];
  siblingDependentObservableNames: string[];
  isRelated: (
    sibling: unknown,
    [selfUseGlobalFilters]: [UseGlobalFilters$ extends Observable<infer TValue> ? TValue : never],
    [siblingUseGlobalFilters]: [boolean | undefined]
  ) => boolean;
};
