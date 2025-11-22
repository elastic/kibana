/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Variant components with their types
export { NoItemsEmptyState, type NoItemsEmptyStateProps } from './no_items';
export { NoResultsEmptyState, type NoResultsEmptyStateProps } from './no_results';
export { ErrorEmptyState, type ErrorEmptyStateProps } from './error';

// Base type (internal, used by variant components)
export type { BaseEmptyStateProps } from './types';
