/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { validateLiquidTemplate } from '@kbn/workflows-yaml';
import type { ValidationIssue } from './types';

/**
 * The LiquidJS syntax validation layer. Parses every `{{ }}` / `{% %}` scalar
 * with the real LiquidJS engine and reports malformed tags/filters/output.
 * Runs unconditionally (even when earlier layers failed). Scope is syntax only:
 * it does not verify that referenced variables/steps resolve.
 */
export const validateLiquid = (yaml: string, document: Document): ValidationIssue[] =>
  validateLiquidTemplate(yaml, document).map((error) => ({
    source: 'liquid',
    message: error.message,
    line: error.startLine,
    column: error.startColumn,
  }));
