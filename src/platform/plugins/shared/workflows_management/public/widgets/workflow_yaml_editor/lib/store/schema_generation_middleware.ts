/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnyAction, Dispatch, Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { _setGeneratedSchemaInternal, setConnectors } from './slice';
import type { RootState } from './types';
import { getWorkflowZodSchemaLoose } from '../../../../../common/schema';

export const schemaGenerationMiddleware: Middleware =
  (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => (next) => (action) => {
    const result = next(action);

    // Only react to connectors changes
    if (setConnectors.match(action)) {
      if (action.payload) {
        const schemaLoose = getWorkflowZodSchemaLoose(action.payload.connectorTypes);
        store.dispatch(_setGeneratedSchemaInternal(schemaLoose));
      }
    }

    return result;
  };
