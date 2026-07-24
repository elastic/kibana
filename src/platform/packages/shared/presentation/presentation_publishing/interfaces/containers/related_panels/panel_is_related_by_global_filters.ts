/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import { apiHasUseGlobalFiltersSetting } from '../../fetch/applies_filters';
import type { RelatedPanelsConfig } from './initialize_related_panels';

export const panelIsRelatedByGlobalFilters = <
  const UseGlobalFilters$ extends Observable<boolean | undefined>
>(
  useGlobalFilters$: UseGlobalFilters$
) => {
  const dependentObservables = [useGlobalFilters$] as const;

  return {
    dependentObservables,
    siblingDependentObservableNames: ['useGlobalFilters$'],
    isRelated: (sibling: unknown, [selfUseGlobalFilters], [siblingUseGlobalFilters]) =>
      apiHasUseGlobalFiltersSetting(sibling)
        ? Boolean(siblingUseGlobalFilters && selfUseGlobalFilters)
        : true,
  } satisfies RelatedPanelsConfig<typeof dependentObservables, [boolean | undefined]>;
};
