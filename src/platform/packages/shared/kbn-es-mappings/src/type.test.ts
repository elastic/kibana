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

    // The expected errors inside the tests are in the following lines
    const errorLines = errorsByLine.map((error) => error.lineNumber);
    expect(errorLines).toStrictEqual([46, 54, 61, 69]);

    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'number' is not assignable to type 'string'.",
          "lineNumber": 46,
          "tsErrorLine": Array [
            "Type Error Explanation: name must be a string",
            "Error Line [46]: name: 123,",
          ],
        },
        Object {
          "errorMessage": "Type 'string' is not assignable to type 'number'.",
          "lineNumber": 54,
          "tsErrorLine": Array [
            "Type Error Explanation: age must be a number",
            "Error Line [54]: age: 'thirty',",
          ],
        },
        Object {
          "errorMessage": "Type 'string' is not assignable to type 'boolean | undefined'.",
          "lineNumber": 61,
          "tsErrorLine": Array [
            "Type Error Explanation: isActive must be a boolean",
            "Error Line [61]: isActive: 'yes',",
          ],
        },
        Object {
          "errorMessage": "Type '\\"invalid_type\\"' is not assignable to type '\\"boolean\\" | \\"object\\" | \\"keyword\\" | \\"text\\" | \\"date_nanos\\" | \\"date\\" | \\"byte\\" | \\"double\\" | \\"float\\" | \\"integer\\" | \\"long\\" | \\"short\\"'.",
          "lineNumber": 69,
          "tsErrorLine": Array [
            "Type Error Explanation: not_mapped is not defined in the mapping",
            "Error Line [69]: not_mapped: { type: 'invalid_type' },",
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

    // The expected errors inside the tests are in the following lines
    const errorLines = errorsByLine.map((error) => error.lineNumber);
    expect(errorLines).toStrictEqual([84, 86, 120, 122, 124, 154]);

    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 84,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [84]: Object.assign(new Error(), 'The following keys are missing from the document fields: createdAt'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 86,
          "tsErrorLine": Array [
            "Type Error Explanation: Unknown Key is not in the definition, this checks that an error is thrown for the unknown key",
            "Error Line [86]: Object.assign(",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 120,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [120]: Object.assign(new Error(), 'The following keys are missing from the document fields: name'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.",
          "lineNumber": 122,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [122]: Object.assign(new Error(), 'The following keys are missing from the document fields: createdAt'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.",
          "lineNumber": 124,
          "tsErrorLine": Array [
            "Type Error Explanation: Unknown Key is not in the definition, this checks that an error is thrown for the unknown key",
            "Error Line [124]: Object.assign(",
          ],
        },
        Object {
          "errorMessage": "Type 'FullEsDocumentFields' does not satisfy the constraint 'Partial<{ name: string; age: number; email: string; isActive: boolean; createdAt: boolean; }>'.
        Types of property 'createdAt' are incompatible.
          Type 'string | number' is not assignable to type 'boolean | undefined'.
            Type 'string' is not assignable to type 'boolean | undefined'.",
          "lineNumber": 154,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [154]: FullEsDocumentFields",
          ],
        },
      ]
    `);
  });

  it('should validate Exact type in helpers.ts', () => {
    const fixturePath = path.join(__dirname, '__fixture__', 'helpers_example.ts');

    const program = createProgramForFixture(fixturePath);
    const diagnostics = getDiagnosticsIgnoringTsIgnores(fixturePath, program);

    const errorsByLine = groupDiagnosticsByLine(fixturePath, diagnostics);
    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstThree\\"' is not assignable to type 'MissingKeysError<\\"exclusiveFirstOne\\" | \\"exclusiveFirstTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstThree\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: exclusiveFirstThree\\"' is not assignable to type '\\"The following keys are missing from the document fields: exclusiveFirstTwo\\"'.",
          "lineNumber": 51,
          "tsErrorLine": Array [
            "Type Error Explanation: exclusiveFirstThree is not in the excludedKeys",
            "Error Line [51]: Object.assign(",
          ],
        },
      ]
    `);
  });
});
