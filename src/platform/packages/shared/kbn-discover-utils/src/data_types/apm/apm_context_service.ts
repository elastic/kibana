/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmSourceAccessPluginStart, APMIndices } from '@kbn/apm-sources-access-plugin/public';
import { createTracesContextService, type TracesContextService } from '../traces';
import {
  createErrorsContextService,
  type ErrorsContextService,
} from './errors/errors_context_service';

export interface ApmContextService {
  tracesService: TracesContextService;
  errorsService: ErrorsContextService;
}

export const createApmContextService = async ({
  apmSourcesAccess,
}: {
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}): Promise<ApmContextService> => {
  // Fetch indices once
  let indices: Readonly<APMIndices> | null = null;

  if (apmSourcesAccess) {
    try {
      indices = await apmSourcesAccess.getApmIndices();
    } catch (error) {
      indices = null;
    }
  }

  return {
    tracesService: createTracesContextService({ indices }),
    errorsService: createErrorsContextService({ indices }),
  };
};
