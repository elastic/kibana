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

// ---------------------------------------------------------------------------
// Minimal valid YAML fixtures
// ---------------------------------------------------------------------------

const PLAIN_WORKFLOW_YAML = `
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: 1s
`.trim();

const TEMPLATE_YAML = `
template-metadata:
  slug: my-test-template
  version: 1.0.0
  availability: ">=9.5.0 <9.6.0"
  name: My Test Template
  description: A test template for validation.
  categories:
    - observability
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: 1s
`.trim();

const TEMPLATE_BAD_SLUG_YAML = `
template-metadata:
  slug: BAD_SLUG
  version: 1.0.0
  availability: ">=9.5.0 <9.6.0"
  name: My Test Template
  description: A test template.
  categories:
    - observability
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: 1s
`.trim();

const TEMPLATE_MISSING_CATEGORIES_YAML = `
template-metadata:
  slug: my-test-template
  version: 1.0.0
  availability: ">=9.5.0 <9.6.0"
  name: My Test Template
  description: A test template.
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: 1s
`.trim();

const TEMPLATE_BAD_INSTALL_FORM_YAML = `
template-metadata:
  slug: my-test-template
  version: 1.0.0
  availability: ">=9.5.0 <9.6.0"
  name: My Test Template
  description: A test template.
  categories:
    - observability
  install:
    form:
      - name: my-field
        inputType: not-a-valid-type
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: 1s
`.trim();

describe('validateExampleYaml', () => {
  const schema = buildWorkflowSchema();

  // ---------------------------------------------------------------------------
  // __install__ wildcard suppression
  // ---------------------------------------------------------------------------

  describe('__install__ placeholder suppression', () => {
    it('accepts __install__.field where a specific type is expected (auto mode)', () => {
      // duration expects DurationSchema (/^\d+(ms|[smhdw])$/), but
      // __install__.myDuration must be treated as a wildcard and not flagged.
      const yaml = `
template-metadata:
  slug: my-test-template
  version: 1.0.0
  availability: ">=9.5.0 <9.6.0"
  name: My Test Template
  description: A test template.
  categories:
    - observability
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: __install__.myDuration
`.trim();
      expect(validateExampleYaml(yaml, schema).kind).toBe('ok');
    });

    it('accepts __install__.field in --template mode', () => {
      const yaml = `
template-metadata:
  slug: my-test-template
  version: 1.0.0
  availability: ">=9.5.0 <9.6.0"
  name: My Test Template
  description: A test template.
  categories:
    - observability
name: test-workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: noop
    type: wait
    with:
      duration: __install__.myDuration
`.trim();
      expect(validateExampleYaml(yaml, schema, 'template').kind).toBe('ok');
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-existing baseline tests
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Auto mode: plain workflow
  // ---------------------------------------------------------------------------

  describe('auto mode (default)', () => {
    it('accepts a plain workflow', () => {
      const result = validateExampleYaml(PLAIN_WORKFLOW_YAML, schema);
      expect(result.kind).toBe('ok');
    });

    it('accepts a valid template', () => {
      const result = validateExampleYaml(TEMPLATE_YAML, schema);
      expect(result.kind).toBe('ok');
    });

    it('rejects a template with a bad slug', () => {
      const result = validateExampleYaml(TEMPLATE_BAD_SLUG_YAML, schema);
      expect(result.kind).toBe('schema-error');
      if (result.kind === 'schema-error') {
        expect(result.issues.some((i) => i.path.startsWith('template-metadata'))).toBe(true);
      }
    });

    it('rejects a template with missing required metadata field', () => {
      const result = validateExampleYaml(TEMPLATE_MISSING_CATEGORIES_YAML, schema);
      expect(result.kind).toBe('schema-error');
      if (result.kind === 'schema-error') {
        expect(result.issues.some((i) => i.path.startsWith('template-metadata'))).toBe(true);
      }
    });

    it('rejects a template with an invalid install-form field type', () => {
      const result = validateExampleYaml(TEMPLATE_BAD_INSTALL_FORM_YAML, schema);
      expect(result.kind).toBe('schema-error');
      if (result.kind === 'schema-error') {
        expect(result.issues.some((i) => i.path.startsWith('template-metadata'))).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // --plain mode
  // ---------------------------------------------------------------------------

  describe('--plain mode', () => {
    it('accepts a plain workflow', () => {
      const result = validateExampleYaml(PLAIN_WORKFLOW_YAML, schema, 'plain');
      expect(result.kind).toBe('ok');
    });

    it('rejects a template as wrong-type', () => {
      const result = validateExampleYaml(TEMPLATE_YAML, schema, 'plain');
      expect(result.kind).toBe('wrong-type');
      if (result.kind === 'wrong-type') {
        expect(result.expected).toBe('plain');
      }
    });

    it('rejects a template with bad metadata as wrong-type (not schema-error)', () => {
      // Mode mismatch wins over metadata error
      const result = validateExampleYaml(TEMPLATE_BAD_SLUG_YAML, schema, 'plain');
      expect(result.kind).toBe('wrong-type');
    });
  });

  // ---------------------------------------------------------------------------
  // --template mode
  // ---------------------------------------------------------------------------

  describe('--template mode', () => {
    it('accepts a valid template', () => {
      const result = validateExampleYaml(TEMPLATE_YAML, schema, 'template');
      expect(result.kind).toBe('ok');
    });

    it('rejects a plain workflow as wrong-type', () => {
      const result = validateExampleYaml(PLAIN_WORKFLOW_YAML, schema, 'template');
      expect(result.kind).toBe('wrong-type');
      if (result.kind === 'wrong-type') {
        expect(result.expected).toBe('template');
      }
    });

    it('rejects a template with a bad slug', () => {
      const result = validateExampleYaml(TEMPLATE_BAD_SLUG_YAML, schema, 'template');
      expect(result.kind).toBe('schema-error');
      if (result.kind === 'schema-error') {
        const paths = result.issues.map((i) => i.path);
        expect(paths.some((p) => p.startsWith('template-metadata'))).toBe(true);
      }
    });

    it('rejects a template with missing required metadata field', () => {
      const result = validateExampleYaml(TEMPLATE_MISSING_CATEGORIES_YAML, schema, 'template');
      expect(result.kind).toBe('schema-error');
      if (result.kind === 'schema-error') {
        expect(result.issues.some((i) => i.path.startsWith('template-metadata'))).toBe(true);
      }
    });

    it('rejects a template with an invalid install-form field type', () => {
      const result = validateExampleYaml(TEMPLATE_BAD_INSTALL_FORM_YAML, schema, 'template');
      expect(result.kind).toBe('schema-error');
      if (result.kind === 'schema-error') {
        expect(result.issues.some((i) => i.path.startsWith('template-metadata'))).toBe(true);
      }
    });

    it('surfaces syntax errors before wrong-type', () => {
      const result = validateExampleYaml('name: "bad', schema, 'template');
      expect(result.kind).toBe('syntax-error');
    });
  });

  // ---------------------------------------------------------------------------
  // Bundled in-repo examples (always run in auto mode)
  // ---------------------------------------------------------------------------

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
