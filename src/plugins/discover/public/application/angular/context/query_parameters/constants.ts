/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createInitialQueryParametersState } from './state';

export const MAX_CONTEXT_SIZE = 10000; // Elasticsearch's default maximum size limit
export const MIN_CONTEXT_SIZE = 0;
export const QUERY_PARAMETER_KEYS = Object.keys(createInitialQueryParametersState());
