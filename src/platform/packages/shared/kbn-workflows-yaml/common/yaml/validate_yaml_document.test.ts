/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getYamlDocumentErrors } from './validate_yaml_document';
import { InvalidYamlSyntaxError } from '../errors';

describe('getYamlDocumentErrors', () => {
  it('returns empty array for valid YAML', () => {
    const doc = parseDocument(`
steps:
  - name: s1
    type: noop
`);
    expect(getYamlDocumentErrors(doc)).toEqual([]);
  });

  it('returns InvalidYamlSyntaxError for YAML parse errors', () => {
    const doc = parseDocument('key: [invalid');
    const errors = getYamlDocumentErrors(doc);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toBeInstanceOf(InvalidYamlSyntaxError);
  });

  it('detects non-scalar keys', () => {
    // Use a YAML document with a map key (non-scalar)
    const doc = parseDocument('? [a, b]\n: value');
    const errors = getYamlDocumentErrors(doc);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.message.includes('Invalid key type'))).toBe(true);
  });
});
