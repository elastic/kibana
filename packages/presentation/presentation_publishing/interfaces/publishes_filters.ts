/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { PublishingSubject } from '../publishing_subject';

export interface PublishesFilter {
  filter$: PublishingSubject<Filter | undefined>;
}

export const apiPublishesFilter = (unknownApi: unknown): unknownApi is PublishesFilter => {
  return Boolean(unknownApi && (unknownApi as PublishesFilter)?.filter$ !== undefined);
};

export interface PublishesFilters {
  filters$: PublishingSubject<Filter[] | undefined>;
}

export const apiPublishesFilters = (unknownApi: unknown): unknownApi is PublishesFilter => {
  return Boolean(unknownApi && (unknownApi as PublishesFilters)?.filters$ !== undefined);
};
