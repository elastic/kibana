/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../../profiles';

export interface CreateRecommendedFieldsParams {
  recommendedFields?: string[];
}

const DEFAULT_RECOMMENDED_LOG_FIELDS = [
  'log.level',
  'message',
  'error.message',
  'event.action',
  'host.name',
  'service.name',
  'trace.id',
  'container.id',
  'orchestrator.namespace',
];

/**
 * Provides recommended fields for the field list sidebar
 * Surfaces the most commonly used log fields for quick access
 */
export const createRecommendedFields = ({
  recommendedFields = DEFAULT_RECOMMENDED_LOG_FIELDS,
}: CreateRecommendedFieldsParams = {}): DataSourceProfileProvider['profile']['getRecommendedFields'] => {
  return () => () => ({
    recommendedFields,
  });
};
