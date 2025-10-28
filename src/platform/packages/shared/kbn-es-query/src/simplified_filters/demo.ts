/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SimplifiedFilter Demo: Examples showing modular conversion functions
 *
 * This file demonstrates how to use the new modular filter conversion utilities
 * for bi-directional conversion between SimplifiedFilter and stored Filter formats.
 * Shows both the new functional API and backward-compatible class API.
 */

import type { Filter, SimplifiedFilter } from '@kbn/es-query-server';
import { createFilter, field, and, FilterPatterns } from '.';
// New modular imports
import {
  fromStoredFilter,
  toStoredFilter,
  validate,
  convertToSimpleCondition,
  isFullyCompatible as isFullyCompatibleFn,
  isEnhancedCompatible as isEnhancedCompatibleFn,
  extractBaseProperties,
} from './conversion';

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
// DEMO: NEW MODULAR API - INDIVIDUAL FUNCTIONS
// ====================================================================

/**
 * Demo: Using individual modular functions for targeted operations
 */
export function demoModularAPI() {
  // Example: Legacy filter from production system
  const legacyStoredFilter: Filter = {
    meta: {
      type: 'phrase',
      key: 'user.status',
      params: { query: 'premium' },
      alias: 'Premium Users',
      disabled: false,
      negate: false,
    },
    query: {
      term: { 'user.status': 'premium' },
    },
  };

  // NEW MODULAR APPROACH - Use individual functions

  // 1. Check filter compatibility level before conversion
  const isFullyCompatibleResult = isFullyCompatibleFn(legacyStoredFilter);
  const isEnhancedCompatibleResult = isEnhancedCompatibleFn(legacyStoredFilter);

  // 2. Extract base properties (useful for analysis)
  const baseProps = extractBaseProperties(legacyStoredFilter);

  // 3. Convert using the appropriate function
  const simplifiedFilter = fromStoredFilter(legacyStoredFilter);

  // 4. Validate the result with detailed error information
  const validation = validate(simplifiedFilter);

  // 5. Individual conversion function (useful for testing/debugging)
  let conditionDemo = null;
  if (legacyStoredFilter.meta?.type === 'phrase') {
    conditionDemo = convertToSimpleCondition(legacyStoredFilter);
    // condition now contains the extracted SimpleFilterCondition
  }

  return {
    compatibility: {
      isFullyCompatible: isFullyCompatibleResult,
      isEnhancedCompatible: isEnhancedCompatibleResult,
    },
    extractedProperties: baseProps,
    convertedFilter: simplifiedFilter,
    validation,
    individualFunctionDemo: conditionDemo,
  };
}

// ====================================================================
// DEMO: FILTER TRANSFORMATION (SIMPLIFIED ↔ STORED)
// ====================================================================

/**
 * Demo: Convert SimplifiedFilter to stored format for persistence
 * Shows both new functional API and backward-compatible class API
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

  // FUNCTIONAL API for conversion
  const storedFilter = toStoredFilter(simplifiedFilter);
  const backToSimplified = fromStoredFilter(storedFilter);
  const validationResult = validate(simplifiedFilter);

  return {
    simplifiedFilter,
    storedFilter,
    backToSimplified,
    validation: validationResult,
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
    fromStoredFilter(null);
  } catch (error) {
    // Conversion error handling
    return { error: error.message, originalFilter: error.originalFilter };
  }

  // Validation errors
  const invalidFilter = {
    // Missing required discriminated union property
  } as SimplifiedFilter;

  const validation = validate(invalidFilter);
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
  const modernFilter = fromStoredFilter(legacyFilter);

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

// ====================================================================
// DEMO: UNIT TESTING BENEFITS
// ====================================================================

/**
 * Demo: How the modular approach improves testability
 */
export function demoUnitTestingBenefits() {
  // Example: Test individual functions in isolation

  // 1. Test type detection without full conversion
  const phraseFilter = { meta: { type: 'phrase', params: { query: 'test' } } };
  const scriptFilter = { query: { script: { source: 'doc.field.value > 0' } } };

  const phraseCompatibility = isFullyCompatibleFn(phraseFilter);
  const scriptCompatibility = isFullyCompatibleFn(scriptFilter);

  // 2. Test property extraction independently
  const complexStoredFilter: Filter = {
    $state: { store: 'globalState' },
    meta: {
      key: 'user.id',
      disabled: true,
      alias: 'User Filter',
      negate: true,
      controlledBy: 'dashboard-123',
    },
  };

  const extractedProps = extractBaseProperties(complexStoredFilter);

  // 3. Test validation logic separately
  const validFilter: SimplifiedFilter = {
    condition: { field: 'status', operator: 'is', value: 'active' },
  };

  const invalidFilter = {
    condition: { field: 'status', operator: 'is', value: 'active' },
    group: { type: 'AND', conditions: [] }, // Multiple types - invalid
  } as any;

  const validResult = validate(validFilter);
  const invalidResult = validate(invalidFilter);

  return {
    typeDetection: {
      phraseFilter: { isFullyCompatible: phraseCompatibility },
      scriptFilter: { isFullyCompatible: scriptCompatibility },
    },
    propertyExtraction: extractedProps,
    validation: {
      valid: validResult,
      invalid: invalidResult,
    },
    testingNote: 'Each function can be unit tested independently with focused test cases',
  };
}

/**
 * Demo usage showing the complete filter conversion workflow
 */
export function runAllDemos() {
  const builderExamples = demoSimpleFilterCreation();
  const modularAPIExamples = demoModularAPI();
  const transformationExamples = demoFilterTransformation();
  const unitTestingExamples = demoUnitTestingBenefits();
  const errorHandlingResult = demoErrorHandling();
  const dashboardExamples = demoDashboardFilters();
  const migrationExample = demoLegacyMigration();

  return {
    builderExamples,
    modularAPIExamples,
    transformationExamples,
    unitTestingExamples,
    errorHandlingResult,
    dashboardExamples,
    migrationExample,
  };
}
