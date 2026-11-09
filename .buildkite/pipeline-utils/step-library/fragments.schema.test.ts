/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Every fragment, after the semantic normalization, must satisfy Buildkite's published pipeline
// schema. The schema is vendored (buildkite/pipeline-schema at a038b393) so this test never
// touches the network. To refresh it, from the repo root, replace the fixture and update the commit
// above:
//   curl -sSfL https://raw.githubusercontent.com/buildkite/pipeline-schema/main/schema.json \
//     -o .buildkite/pipeline-utils/step-library/fixtures/buildkite_pipeline_schema.json

import Ajv from 'ajv';
import schema from './fixtures/buildkite_pipeline_schema.json';
import { FRAGMENTS, loadFragmentDocument } from './fragments.ts';

// Fragment name -> the schema errors it is known to produce, with the reason. Fragments are not
// edited to satisfy the schema.
const KNOWN_SCHEMA_EXCEPTIONS: Readonly<Record<string, string>> = {};

// The schema's only non-core format is 'regex' (input step text fields); no fragment uses it.
const validate = new Ajv({ strict: false, allErrors: true, formats: { regex: true } }).compile(
  schema
);

describe('pull_request fragments against the Buildkite pipeline schema', () => {
  it.each(FRAGMENTS.map((fragment) => [fragment.name, fragment] as const))(
    '%s',
    (name, fragment) => {
      const valid = validate(loadFragmentDocument(fragment));
      const errors = valid ? [] : validate.errors;

      if (KNOWN_SCHEMA_EXCEPTIONS[name]) {
        expect(errors).not.toEqual([]);
      } else {
        expect(errors).toEqual([]);
      }
    }
  );

  it('rejects a step with an invalid field', () => {
    expect(validate({ steps: [{ command: 'true', timeout_in_minutes: 'soon' }] })).toBe(false);
  });

  it('rejects the legacy string exit_status, which the normalization exists to fix', () => {
    const step = { command: 'true', retry: { automatic: [{ exit_status: '-1', limit: 3 }] } };

    expect(validate({ steps: [step] })).toBe(false);
  });

  it('has no exception for an unregistered fragment', () => {
    const names = FRAGMENTS.map((fragment) => fragment.name);

    expect(Object.keys(KNOWN_SCHEMA_EXCEPTIONS).filter((name) => !names.includes(name))).toEqual(
      []
    );
  });
});
