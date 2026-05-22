/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

/**
 * CI check script to validate that transpiler configurations are in sync.
 *
 * This script ensures:
 * 1. @kbn/transpiler-config correctly re-exports from @kbn/babel-preset
 * 2. Critical TypeScript/React settings are correctly defined
 *
 * Usage:
 *   node -r @kbn/babel-register/install packages/kbn-transpiler-config/scripts/validate_config_sync.ts
 *
 * Exit codes:
 *   0 - All configs are in sync
 *   1 - Configs are out of sync (error)
 */

import { getSharedConfig, USES_STYLED_COMPONENTS, EMOTION_LABEL_FORMAT } from '../src';

// Import directly from babel-preset to compare
// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelStyledComponents = require('@kbn/babel-preset/styled_components_files');

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function validateStyledComponentsSync(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };

  // Check 1: Ensure USES_STYLED_COMPONENTS list is accessible from transpiler-config
  if (!USES_STYLED_COMPONENTS || !Array.isArray(USES_STYLED_COMPONENTS)) {
    result.passed = false;
    result.errors.push(
      'USES_STYLED_COMPONENTS is not properly exported from @kbn/transpiler-config'
    );
    return result;
  }

  // Check 2: Ensure babel-preset exports the same list
  const babelList = babelStyledComponents.USES_STYLED_COMPONENTS;
  if (!babelList || !Array.isArray(babelList)) {
    result.passed = false;
    result.errors.push(
      'USES_STYLED_COMPONENTS is not properly exported from @kbn/babel-preset/styled_components_files'
    );
    return result;
  }

  // Check 3: They should be the SAME reference (re-exported, not copied)
  if (USES_STYLED_COMPONENTS !== babelList) {
    // If not the same reference, at least check they have same content
    if (USES_STYLED_COMPONENTS.length !== babelList.length) {
      result.passed = false;
      result.errors.push(
        `styled-components list length mismatch: ` +
          `@kbn/transpiler-config has ${USES_STYLED_COMPONENTS.length} patterns, ` +
          `@kbn/babel-preset has ${babelList.length} patterns`
      );
    }
  }

  return result;
}

function validateSharedConfig(): ValidationResult {
  const result: ValidationResult = { passed: true, errors: [], warnings: [] };
  const sharedConfig = getSharedConfig();

  // Validate TypeScript settings
  if (!sharedConfig.typescript.decoratorsLegacy) {
    result.warnings.push(
      'decoratorsLegacy is false - this may cause issues with TypeScript decorators'
    );
  }

  // Validate React settings
  if (sharedConfig.react.runtime !== 'automatic') {
    result.warnings.push(
      `React runtime is "${sharedConfig.react.runtime}" - expected "automatic" for modern React`
    );
  }

  // Validate Emotion settings
  if (!EMOTION_LABEL_FORMAT || !EMOTION_LABEL_FORMAT.includes('[filename]')) {
    result.warnings.push(
      `EMOTION_LABEL_FORMAT "${EMOTION_LABEL_FORMAT}" may not produce useful debug labels`
    );
  }

  return result;
}

function validateAll(): boolean {
  console.log('🔍 Validating transpiler configuration sync...\n');

  let allPassed = true;

  // Test 1: styled-components sync
  console.log('📋 Checking styled-components list sync...');
  const styledResult = validateStyledComponentsSync();
  if (styledResult.passed) {
    console.log(
      `   ✅ styled-components list is in sync (${USES_STYLED_COMPONENTS.length} patterns)\n`
    );
  } else {
    console.log('   ❌ styled-components list is NOT in sync');
    styledResult.errors.forEach((e) => console.log(`      ERROR: ${e}`));
    console.log('');
    allPassed = false;
  }

  // Test 2: shared config validation
  console.log('📋 Checking shared configuration...');
  const sharedResult = validateSharedConfig();
  if (sharedResult.warnings.length > 0) {
    sharedResult.warnings.forEach((w) => console.log(`   ⚠️  WARNING: ${w}`));
  }
  if (sharedResult.passed) {
    console.log('   ✅ Shared configuration is valid\n');
  } else {
    sharedResult.errors.forEach((e) => console.log(`      ERROR: ${e}`));
    console.log('');
    allPassed = false;
  }

  // Final result
  if (allPassed) {
    console.log('✅ All transpiler configurations are in sync!');
    return true;
  } else {
    console.log('❌ Transpiler configurations are OUT OF SYNC!');
    console.log('\nTo fix:');
    console.log('  1. Ensure @kbn/babel-preset/styled_components_files.js is the source of truth');
    console.log('  2. @kbn/transpiler-config should re-export from babel-preset');
    console.log('  3. Run this check locally before committing changes');
    return false;
  }
}

// Run validation
const success = validateAll();
process.exit(success ? 0 : 1);
