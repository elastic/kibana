/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { PublishingSubject } from '../../publishing_subject';

export interface AppliesFilters {
  filtersLoading$: PublishingSubject<boolean>;
  appliedFilters$: PublishingSubject<Filter[] | undefined>;
}

export const apiAppliesFilters = (unknownApi: unknown): unknownApi is AppliesFilters => {
  return Boolean(unknownApi && (unknownApi as AppliesFilters)?.appliedFilters$ !== undefined);
};

export interface AppliesTimeslice {
  appliedTimeslice$: PublishingSubject<[number, number] | undefined>;
}

export const apiAppliesTimeslice = (unknownApi: unknown): unknownApi is AppliesTimeslice => {
  return Boolean(unknownApi && (unknownApi as AppliesTimeslice)?.appliedTimeslice$ !== undefined);
};

export interface HasUseGlobalFiltersSetting {
  useGlobalFilters$: PublishingSubject<boolean | undefined>;
}

export const apiHasUseGlobalFiltersSetting = (
  unknownApi: unknown
): unknownApi is HasUseGlobalFiltersSetting => {
  return Boolean(
    unknownApi && (unknownApi as HasUseGlobalFiltersSetting)?.useGlobalFilters$ !== undefined
  );
};
