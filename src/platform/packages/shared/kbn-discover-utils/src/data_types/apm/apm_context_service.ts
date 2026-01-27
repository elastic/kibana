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

let indicesPromise: Promise<Readonly<APMIndices> | null> | null = null;

const getCachedApmIndices = (
  apmSourcesAccess: ApmSourceAccessPluginStart
): Promise<Readonly<APMIndices> | null> => {
  if (indicesPromise) {
    return indicesPromise;
  }

  indicesPromise = (async () => {
    try {
      return await apmSourcesAccess.getApmIndices();
    } catch (error) {
      indicesPromise = null;
      return null;
    }
  })();

  return indicesPromise;
};

export const createApmContextService = async ({
  apmSourcesAccess,
}: {
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}): Promise<ApmContextService> => {
  const indices = apmSourcesAccess ? await getCachedApmIndices(apmSourcesAccess) : null;

  return {
    tracesService: createTracesContextService({ indices }),
    errorsService: createErrorsContextService({ indices }),
  };
};
