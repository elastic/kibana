/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync, readFileSync } from 'fs';
import Path from 'path';
import { buildWorkflowSchema } from './build_schema';
import { validateExampleYaml } from './validate_example';

const EXAMPLES_DIR = Path.resolve(
  __dirname,
  '../../../../packages/shared/kbn-workflows/spec/examples'
);

// Examples using legacy top-level format (version as integer + workflow: wrapper).
// These are intentionally not fully validatable in a static context.
const SCHEMA_ERROR_EXPECTED = new Set(['basic.yml', 'example_nesting.yml']);

describe('validateExampleYaml', () => {
  const schema = buildWorkflowSchema();

  it('flags YAML syntax errors', () => {
    const result = validateExampleYaml('name: "missing close-quote', schema);
    expect(result.kind).toBe('syntax-error');
  });

  it('flags oversize YAML before parsing', () => {
    const oversize = 'name: x\n' + 'a: '.repeat(2_000_000);
    const result = validateExampleYaml(oversize, schema);
    expect(result.kind).toBe('oversize');
  });

  it('flags schema errors with paths', () => {
    const result = validateExampleYaml('enabled: not-a-boolean\nname: t\nsteps: []\n', schema);
    expect(result.kind).toBe('schema-error');
    if (result.kind === 'schema-error') {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  describe('bundled in-repo examples', () => {
    const files = readdirSync(EXAMPLES_DIR).filter((f) => /\.ya?ml$/i.test(f));

    it.each(files)('validates %s successfully', (filename) => {
      const yaml = readFileSync(Path.join(EXAMPLES_DIR, filename), 'utf8');
      const result = validateExampleYaml(yaml, schema);

      if (SCHEMA_ERROR_EXPECTED.has(filename)) {
        // Legacy format / runtime-only step types: must parse without crashing
        expect(result.kind).not.toBe('syntax-error');
        expect(result.kind).not.toBe('oversize');
        expect(result.kind).not.toBe('unexpected-error');
      } else {
        expect(result.kind).toBe('ok');
      }
    });
  });
});
