/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SimplifiedFilter Demo: Examples showing FilterTransformer usage
 *
 * This file demonstrates how to use the FilterTransformer utilities
 * for bi-directional conversion between SimplifiedFilter and stored Filter formats.
 */

import type { SimplifiedFilter } from '@kbn/es-query-server';
import { FilterTransformer, createFilter, field, and, FilterPatterns } from '.';

// ====================================================================
// DEMO: CREATING SIMPLIFIED FILTERS WITH BUILDER API
// ====================================================================

/**
 * Demo: Create simple filters using the fluent builder API
 */
export function demoSimpleFilterCreation() {
  // Method 1: Using FilterPatterns for common cases
  const statusFilter = FilterPatterns.equals('status', 'active');
  const rangeFilter = FilterPatterns.range('timestamp', '2024-01-01', '2024-12-31');
  const existsFilter = FilterPatterns.exists('user.id');

  // Method 2: Using fluent builder API
  const regionFilter = createFilter()
    .indexPattern('logs-*')
    .pinned(true)
    .condition(field('region').isOneOf(['us-east', 'us-west', 'eu-central']));

  // Method 3: Complex group filter
  const complexFilter = createFilter()
    .indexPattern('logs-*')
    .controlledBy('dashboard')
    .group(
      and()
        .addCondition(field('log.level').is('ERROR'))
        .addCondition(field('service.name').isNot('test-service'))
        .addGroup(
          and()
            .addCondition(field('host.name').exists())
            .addCondition(field('timestamp').gte('2024-01-01'))
            .build()
        )
        .build()
    );

  return {
    statusFilter,
    rangeFilter,
    existsFilter,
    regionFilter,
    complexFilter,
  };
}

// ====================================================================
// DEMO: FILTER TRANSFORMATION (SIMPLIFIED ↔ STORED)
// ====================================================================

/**
 * Demo: Convert SimplifiedFilter to stored format for persistence
 */
export function demoFilterTransformation() {
  // Create a SimplifiedFilter
  const simplifiedFilter: SimplifiedFilter = {
    id: 'status-filter',
    indexPattern: 'logs-*',
    pinned: true,
    label: 'Active Status Only',
    condition: {
      field: 'status',
      operator: 'is',
      value: 'active',
    },
  };

  // Convert to stored format (for saving to savedObject or URL state)
  const storedFilter = FilterTransformer.toStoredFilter(simplifiedFilter);

  // Convert back to SimplifiedFilter (when loading from savedObject or URL state)
  const backToSimplified = FilterTransformer.fromStoredFilter(storedFilter);

  // Validate a SimplifiedFilter
  const validationResult = FilterTransformer.validate(simplifiedFilter);

  return {
    simplifiedFilter,
    storedFilter,
    backToSimplified,
    validationResult,
  };
}

// ====================================================================
// DEMO: ERROR HANDLING
// ====================================================================

/**
 * Demo: Error handling during filter conversion
 */
export function demoErrorHandling() {
  try {
    // This will throw a FilterConversionError
    FilterTransformer.fromStoredFilter(null);
  } catch (error) {
    // Conversion error handling
    return { error: error.message, originalFilter: error.originalFilter };
  }

  // Validation errors
  const invalidFilter = {
    // Missing required discriminated union property
  } as SimplifiedFilter;

  const validation = FilterTransformer.validate(invalidFilter);
  if (!validation.valid) {
    return { validationErrors: validation.errors, warnings: validation.warnings };
  }

  return { success: true };
}

// ====================================================================
// DEMO: REAL-WORLD USE CASES
// ====================================================================

/**
 * Demo: Common dashboard filter scenarios
 */
export function demoDashboardFilters() {
  // Time range filter (90% of dashboards)
  const timeFilter = FilterPatterns.range('@timestamp', 'now-24h', 'now');

  // Status filter with multiple values (common in logs/metrics)
  const logLevelFilter = field('log.level').isOneOf(['ERROR', 'WARN']);

  // Service exclusion filter (common in observability)
  const serviceFilter = field('service.name').isNotOneOf(['health-check', 'test-service']);

  // Complex business logic filter
  const businessFilter = createFilter()
    .indexPattern('business-metrics-*')
    .label('High Value Customers')
    .metadata({ createdBy: 'business-dashboard', version: '2.1.0' })
    .group(
      and()
        .addCondition(field('customer.tier').is('premium'))
        .addCondition(field('transaction.amount').gte(1000))
        .addCondition(field('customer.region').isOneOf(['north-america', 'europe']))
        .build()
    );

  return {
    timeFilter,
    logLevelFilter,
    serviceFilter,
    businessFilter,
  };
}

// ====================================================================
// DEMO: MIGRATION FROM LEGACY FILTERS
// ====================================================================

/**
 * Demo: Converting legacy FilterMeta format to SimplifiedFilter
 */
export function demoLegacyMigration() {
  // Simulated legacy filter (complex FilterMetaParams structure)
  const legacyFilter = {
    $state: { store: 'appState' },
    meta: {
      alias: 'Status Filter',
      disabled: false,
      negate: false,
      key: 'status',
      field: 'status',
      type: 'phrase',
      params: { query: 'active' },
    },
    query: {
      term: { status: 'active' },
    },
  };

  // Convert legacy filter to SimplifiedFilter
  const modernFilter = FilterTransformer.fromStoredFilter(legacyFilter);

  // Result: Clean, typed, validated SimplifiedFilter
  // Example result:
  // {
  //   condition: {
  //     field: 'status',
  //     operator: 'is',
  //     value: 'active',
  //     label: 'Status Filter'
  //   }
  // }

  return modernFilter;
}

/**
 * Demo usage showing the complete FilterTransformer workflow
 */
export function runAllDemos() {
  const builderExamples = demoSimpleFilterCreation();
  const transformationExamples = demoFilterTransformation();
  const errorHandlingResult = demoErrorHandling();
  const dashboardExamples = demoDashboardFilters();
  const migrationExample = demoLegacyMigration();

  return {
    builderExamples,
    transformationExamples,
    errorHandlingResult,
    dashboardExamples,
    migrationExample,
  };
}
