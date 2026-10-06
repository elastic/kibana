/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlView } from '@kbn/esql-types';
/**
 * Maps a view output column to the underlying index field when a DSL filter is valid.
 * Returns undefined for aggregates, expressions, unresolved sources, and non-view patterns.
 */
export declare const resolveViewColumnToIndexField: (
  fieldName: string,
  indexPattern: string,
  views: readonly EsqlView[]
) => string | undefined;
