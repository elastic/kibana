/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

/* eslint-disable import/no-nodejs-modules */
import { Ajv } from 'ajv';
import { readFileSync, writeFileSync } from 'fs';
import Path from 'path';
import yaml from 'yaml';
import { getWorkflowJsonSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { getWorkflowZodSchema } from './schema';

const JSON_SCHEMA_FILE_NAME = 'workflow_schema.json';

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

describe('schema.ts', () => {
  // currently this is not working because of the maximum call stack size exceeded error
  // TODO: fix this
  it.skip('should generate a valid JSON schema and validate examples', () => {
    withTiming('Generating JSON schema', generateAndSaveJSONSchema);
    const jsonSchema = withTiming('Loading JSON schema', loadJSONSchema);
    const validate = withTiming('Compiling JSON schema', () => compileJSONSchema(jsonSchema));
    examples.forEach((example) => {
      console.log(`Validating example: ${example.name}`);
      const result = validate(yaml.parse(example.yaml));
      console.log(`Validation result: ${result}`);
      console.log(`${example.name}: ${result ? 'valid' : 'invalid'}`);
      console.log(validate.errors);
    });
  });
});

function compileJSONSchema(jsonSchema: z.core.JSONSchema.JSONSchema) {
  const ajv = new Ajv({
    strict: false,
    validateFormats: false,
    inlineRefs: false,
  });
  return ajv.compile(jsonSchema);
}

function generateAndSaveJSONSchema() {
  const schema = getWorkflowZodSchema({});
  const jsonSchema = getWorkflowJsonSchema(schema);
  if (!jsonSchema) {
    throw new Error('JSON schema is null');
  }
  writeFileSync(Path.join(__dirname, JSON_SCHEMA_FILE_NAME), JSON.stringify(jsonSchema, null, 2));
  console.log(`JSON schema generated and saved to: ${Path.join(__dirname, JSON_SCHEMA_FILE_NAME)}`);
}

function loadJSONSchema() {
  const jsonSchema = readFileSync(Path.join(__dirname, JSON_SCHEMA_FILE_NAME), 'utf8');
  return JSON.parse(jsonSchema);
}

function withTiming<T>(title: string, fn: () => T): T {
  console.log(`[ ${title}...`);
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  console.log(`..] took ${endTime - startTime} milliseconds`);
  return result;
}
