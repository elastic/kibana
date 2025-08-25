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
// import type { HasParentApi } from '../has_parent_api';

export interface AppliesFilters {
  // extends HasParentApi<{ autoApplyFilters$: PublishingSubject<boolean> }> {
  // draftFilters$: PublishingSubject<Filter[] | undefined>;
  appliedFilters$: PublishingSubject<Filter[] | undefined>;
  hasDraftFilters$: PublishingSubject<boolean>;
  commitFilters: () => void;
}

export const apiAppliesFilters = (unknownApi: unknown): unknownApi is AppliesFilters => {
  console.log(unknownApi);
  return Boolean(unknownApi && (unknownApi as AppliesFilters)?.appliedFilters$ !== undefined);
};
