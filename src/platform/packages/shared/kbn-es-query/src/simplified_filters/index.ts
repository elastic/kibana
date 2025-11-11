/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SimplifiedFilter API - Exports for @kbn/data-service package
 *
 * This module provides utilities for working with simplified filters in Kibana's
 * Dashboards as Code API, including type definitions, conversion utilities,
 * validation schemas, and fluent builders.
 */

// Core types and interfaces
export type { ValidationResult, ValidationError } from './types';

// Conversion utilities
export { FilterConversionError } from './errors';
export { fromStoredFilter, toStoredFilter, validate } from './conversion';

// Fluent builder API
export { SimpleFilterBuilder } from './simple_filter_builder';
export { FilterGroupBuilder } from './filter_group_builder';
export {
  FilterBuilder,
  createFilter,
  field,
  and,
  or,
  dsl,
  FilterPatterns,
} from './main_filter_builder';

// Re-export patterns for convenience
export { FilterPatterns as Patterns } from './main_filter_builder';
