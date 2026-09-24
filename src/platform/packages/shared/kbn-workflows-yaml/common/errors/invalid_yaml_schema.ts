/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

export interface MockZodIssue {
  code: 'invalid_literal' | 'unknown';
  message: string;
  path: string[];
  received: string;
}

export interface MockZodError {
  message: string;
  issues: MockZodIssue[];
}

export interface FormattedZodError {
  message: string;
  issues: z.core.$ZodIssue[] | MockZodIssue[];
}

export class InvalidYamlSchemaError extends Error {
  public formattedZodError?: FormattedZodError;

  constructor(message: string, formattedZodError?: FormattedZodError) {
    super(message);
    this.name = 'InvalidYamlSchemaError';
    this.formattedZodError = formattedZodError;
  }
}
