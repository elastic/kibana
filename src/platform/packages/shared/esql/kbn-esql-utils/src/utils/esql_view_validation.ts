/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MAX_ESQL_VIEW_NAME_LENGTH = 255;
export const MAX_ESQL_VIEW_DESCRIPTION_LENGTH = 1_000;

export type EsqlViewNameValidationError = 'required' | 'invalidFormat' | 'tooLong';

const INVALID_VIEW_NAME_CHARACTERS = /[\\/*?"<>| ,#:]/;
const INVALID_VIEW_NAME_START = /^[-_+]/;

const getByteLength = (value: string): number => new TextEncoder().encode(value).length;

export const validateEsqlViewName = (name: string): EsqlViewNameValidationError | undefined => {
  if (name.length === 0) {
    return 'required';
  }

  if (getByteLength(name) > MAX_ESQL_VIEW_NAME_LENGTH) {
    return 'tooLong';
  }

  if (
    name !== name.toLowerCase() ||
    INVALID_VIEW_NAME_CHARACTERS.test(name) ||
    INVALID_VIEW_NAME_START.test(name) ||
    name === '.' ||
    name === '..'
  ) {
    return 'invalidFormat';
  }
};
