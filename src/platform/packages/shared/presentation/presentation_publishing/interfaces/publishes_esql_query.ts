/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { PublishingSubject } from '../publishing_subject';

export interface PublishesESQLQuery {
  query$: PublishingSubject<AggregateQuery>;
}
/**
 * Type guard to check if an embeddable publishes an ES|QL query.
 * The `in` operator throws if the right-hand side is not an object, so we must guard against that.
 */
export const apiPublishesESQLQuery = (api: unknown): api is PublishesESQLQuery => {
  const query = (api as PublishesESQLQuery).query$?.value;
  return Boolean(query) && typeof query === 'object' && 'esql' in query;
};
