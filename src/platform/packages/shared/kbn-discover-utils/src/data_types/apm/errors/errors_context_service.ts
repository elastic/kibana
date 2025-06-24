/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';

export interface ApmErrorsContextService {
  getErrorsIndexPattern(): string;
}

export interface ApmErrorsContextServiceDeps {
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

// should we have defaults here?
export const DEFAULT_ALLOWED_APM_ERRORS_BASE_PATTERNS = [];

export const createApmErrorsContextService = async ({
  apmSourcesAccess,
}: ApmErrorsContextServiceDeps): Promise<ApmErrorsContextService> => {
  if (!apmSourcesAccess) {
    return defaultApmErrorsContextService;
  }

  try {
    const indices = await apmSourcesAccess.getApmIndices();

    if (!indices) {
      return defaultApmErrorsContextService;
    }

    const { error } = indices;
    return getApmErrorsContextService(error);
  } catch (error) {
    return defaultApmErrorsContextService;
  }
};

export const getApmErrorsContextService = (error: string) => ({
  getErrorsIndexPattern: () => error,
});

const defaultApmErrorsContextService = getApmErrorsContextService(
  DEFAULT_ALLOWED_APM_ERRORS_BASE_PATTERNS.join()
);
