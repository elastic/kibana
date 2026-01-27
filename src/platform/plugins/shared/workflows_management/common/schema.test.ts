/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable import/no-nodejs-modules */
// We only use Node.js modules in this test file to read example yaml files

import { readFileSync } from 'fs';
import Path from 'path';
import { parseWorkflowYamlToJSON } from './lib/yaml';
import { getWorkflowZodSchema } from './schema';

describe('schema', () => {
  describe('getWorkflowZodSchema: elasticsearch steps', () => {
    const examples = [
      {
        name: 'national_parks.yaml',
        yaml: readFileSync(Path.join(__dirname, 'examples', 'national_parks.yaml'), 'utf8'),
      },
      {
        name: 'automated_triaging.yaml',
        yaml: readFileSync(Path.join(__dirname, 'examples', 'automated_triaging.yaml'), 'utf8'),
      },
    ];
    it('should return the correct schema', () => {
      const schema = getWorkflowZodSchema({});
      expect(schema).toBeDefined();
    });
    examples.forEach((example) => {
      it(`should parse ${example.name} with zod schema`, () => {
        const schema = getWorkflowZodSchema({});
        const result = parseWorkflowYamlToJSON(example.yaml, schema);
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
      });
    });
  });
});
