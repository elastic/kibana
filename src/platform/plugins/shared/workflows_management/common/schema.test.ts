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
import yaml from 'yaml';
import { parseWorkflowYamlToJSON } from './lib/yaml';
import { getWorkflowZodSchema } from './schema';

describe('getWorkflowZodSchema: elasticsearch steps', () => {
  it('should return the correct schema', () => {
    const schema = getWorkflowZodSchema({});
    expect(schema).toBeDefined();
  });
  it('should parse national_parks.yaml', () => {
    const schema = getWorkflowZodSchema({});
    const workflowYaml = readFileSync(
      Path.join(__dirname, 'examples', 'national_parks.yaml'),
      'utf8'
    );
    const simpleParse = yaml.parse(workflowYaml);
    const result = parseWorkflowYamlToJSON(workflowYaml, schema);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.data).toEqual(simpleParse);
  });
});
