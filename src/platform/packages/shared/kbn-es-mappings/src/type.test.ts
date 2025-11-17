/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import {
  createProgramForFixture,
  getDiagnosticsIgnoringTsIgnores,
  groupDiagnosticsByLine,
} from './__jest__/ts_helpers';

describe('Type checking with TypeScript compiler', () => {
  it('should validate MappingsDefinition and DocumentOf types in mappings_example.ts', () => {
    const fixturePath = path.join(__dirname, '__fixture__', 'mappings_example.ts');

    const program = createProgramForFixture(fixturePath);
    const diagnostics = getDiagnosticsIgnoringTsIgnores(fixturePath, program);

    const errorsByLine = groupDiagnosticsByLine(fixturePath, diagnostics);

    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'number' is not assignable to type 'string'.",
          "lineNumber": 46,
          "tsErrorLine": Array [
            "- name must be a string",
            "  name: 123,",
          ],
        },
        Object {
          "errorMessage": "Type 'string' is not assignable to type 'number'.",
          "lineNumber": 54,
          "tsErrorLine": Array [
            "- age must be a number",
            "  age: 'thirty',",
          ],
        },
        Object {
          "errorMessage": "Type 'string' is not assignable to type 'boolean | undefined'.",
          "lineNumber": 61,
          "tsErrorLine": Array [
            "- isActive must be a boolean",
            "  isActive: 'yes',",
          ],
        },
        Object {
          "errorMessage": "Type '\\"invalid_type\\"' is not assignable to type '\\"boolean\\" | \\"object\\" | \\"keyword\\" | \\"text\\" | \\"date\\" | \\"byte\\" | \\"double\\" | \\"float\\" | \\"integer\\" | \\"long\\"'.",
          "lineNumber": 69,
          "tsErrorLine": Array [
            "- not_mapped is not defined in the mapping",
            "    not_mapped: { type: 'invalid_type' },",
          ],
        },
      ]
    `);
  });

  it('should validate EnsureSubsetOf type in subset_example.ts', () => {
    const fixturePath = path.join(__dirname, '__fixture__', 'subset_example.ts');

    const program = createProgramForFixture(fixturePath);
    const diagnostics = getDiagnosticsIgnoringTsIgnores(fixturePath, program);

    const errorsByLine = groupDiagnosticsByLine(fixturePath, diagnostics);
    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 77,
          "tsErrorLine": Array [
            "- createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "  Object.assign( new Error(), 'The following keys are missing from the document fields: createdAt'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 79,
          "tsErrorLine": Array [
            "- Unknown Key is not in the definition, this checks that an error is thrown for the unknown key",
            "  Object.assign( new Error(), 'The following keys are missing from the document fields: Unknown Key'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 106,
          "tsErrorLine": Array [
            "- createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "  Object.assign( new Error(), 'The following keys are missing from the document fields: name'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.",
          "lineNumber": 108,
          "tsErrorLine": Array [
            "- createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "  Object.assign( new Error(), 'The following keys are missing from the document fields: createdAt'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.",
          "lineNumber": 110,
          "tsErrorLine": Array [
            "- Unknown Key is not in the definition, this checks that an error is thrown for the unknown key",
            "  Object.assign( new Error(), 'The following keys are missing from the document fields: Unknown Key'),",
          ],
        },
        Object {
          "errorMessage": "Type 'FullEsDocumentFields' does not satisfy the constraint 'Partial<{ name: string; age: number; email: string; isActive: boolean; createdAt: boolean; }>'.
        Types of property 'createdAt' are incompatible.
          Type 'string | number' is not assignable to type 'boolean | undefined'.
            Type 'string' is not assignable to type 'boolean | undefined'.",
          "lineNumber": 131,
          "tsErrorLine": Array [
            "- createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "  FullEsDocumentFields,",
          ],
        },
      ]
    `);
  });

  it('should validate Exact type in helpers.ts', () => {
    const fixturePath = path.join(__dirname, '__fixture__', 'helpers.ts');

    const program = createProgramForFixture(fixturePath);
    const diagnostics = getDiagnosticsIgnoringTsIgnores(fixturePath, program);

    const errorsByLine = groupDiagnosticsByLine(fixturePath, diagnostics);
    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstThree\\"' is not assignable to type 'MissingKeysError<\\"exclusiveFirstOne\\" | \\"exclusiveFirstTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstThree\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstThree\\"' is not assignable to type '\\"The following keys are missing from the document fields: exclusiveFirstTwo\\"'.",
          "lineNumber": 27,
          "tsErrorLine": Array [
            "- exclusiveFirstThree is not in the excludedKeys",
            "  Object.assign(new Error(), 'The following keys are missing from the document fields: exclusiveFirstThree' as const),",
          ],
        },
      ]
    `);
  });
});
