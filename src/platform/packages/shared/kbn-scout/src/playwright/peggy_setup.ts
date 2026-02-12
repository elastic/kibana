/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Initialize Peggy require hook for .peggy grammar files.
 * This is required for @kbn/tinymath and other packages that use Peggy grammars.
 *
 * Playwright needs to load it as @kbn/scout is dependent on @kbn/streamlang which uses Peggy (`@kbn/tinymath`).
 * Without this, all Playwright tests would fail with: `"whitespace" SyntaxError: Unexpected string`
 *
 * This is similar to the Jest Peggy setup in src/platform/packages/shared/kbn-test/src/jest/transforms/peggy.js.
 */
import { requireHook } from '@kbn/peggy';
requireHook();
