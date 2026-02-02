/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { APMIndices } from '@kbn/apm-sources-access-plugin/public';

export interface ErrorsContextService {
  getErrorsIndexPattern(): string | undefined;
}

export const createErrorsContextService = ({
  indices,
}: {
  indices: APMIndices | null;
}): ErrorsContextService => {
  if (!indices) {
    return defaultErrorsContextService;
  }

  const { error } = indices;
  return getErrorsContextService(error);
};

export const getErrorsContextService = (error?: string) => ({
  getErrorsIndexPattern: () => error,
});

const defaultErrorsContextService = getErrorsContextService(undefined);
