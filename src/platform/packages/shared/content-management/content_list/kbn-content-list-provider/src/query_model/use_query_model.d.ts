/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListQueryModel } from './types';
/**
 * Parse `queryText` into a {@link ContentListQueryModel}.
 *
 * This is a memoized view — the model is recomputed only when `queryText`
 * or field/flag definitions change. It is never stored in state.
 */
export declare const useQueryModel: (queryText: string) => ContentListQueryModel;
