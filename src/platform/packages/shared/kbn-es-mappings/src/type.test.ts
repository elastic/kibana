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
    expect(errorLines).toStrictEqual([46, 54, 61, 69, 90]);

    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'number' is not assignable to type 'string | string[] | undefined'.",
          "lineNumber": 46,
          "tsErrorLine": Array [
            "Type Error Explanation: name must be a string",
            "Error Line [46]: name: 123,",
          ],
        },
        Object {
          "errorMessage": "Type 'string' is not assignable to type 'number | number[] | undefined'.",
          "lineNumber": 54,
          "tsErrorLine": Array [
            "Type Error Explanation: age must be a number",
            "Error Line [54]: age: 'thirty',",
          ],
        },
        Object {
          "errorMessage": "Type 'string' is not assignable to type 'Partial<boolean> | Partial<boolean>[] | undefined'.",
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
        Object {
          "errorMessage": "Property 'unknown' does not exist on type '{ name: TextMapping; age: IntegerMapping; }'.",
          "lineNumber": 90,
          "tsErrorLine": Array [
            "Type Error Explanation: Unknown object nested mapping properties are not allowed",
            "Error Line [90]: export const unknownMappingErrors = objectMapping.properties.nestedObj.properties.unknown;",
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
    expect(errorLines).toStrictEqual([75, 77, 111, 113, 115, 145]);
    expect(errorsByLine).toMatchInlineSnapshot(`
      Array [
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 75,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [75]: Object.assign(new Error(), 'The following keys are missing from the document fields: createdAt'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 77,
          "tsErrorLine": Array [
            "Type Error Explanation: Unknown Key is not in the definition, this checks that an error is thrown for the unknown key",
            "Error Line [77]: Object.assign(",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: name\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 111,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [111]: Object.assign(new Error(), 'The following keys are missing from the document fields: name'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: createdAt\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 113,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [113]: Object.assign(new Error(), 'The following keys are missing from the document fields: createdAt'),",
          ],
        },
        Object {
          "errorMessage": "Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'MissingKeysError<\\"definedButNotInDocOne\\" | \\"definedButNotInDocTwo\\">'.
        Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type 'Error & \\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.
          Type 'Error & \\"The following keys are missing from the document fields: Unknown Key\\"' is not assignable to type '\\"The following keys are missing from the document fields: definedButNotInDocTwo\\"'.",
          "lineNumber": 115,
          "tsErrorLine": Array [
            "Type Error Explanation: Unknown Key is not in the definition, this checks that an error is thrown for the unknown key",
            "Error Line [115]: Object.assign(",
          ],
        },
        Object {
          "errorMessage": "Type 'FullEsDocumentFields' does not satisfy the constraint 'Partial<{ name?: string | string[] | undefined; age?: number | number[] | undefined; email?: string | string[] | undefined; isActive?: Partial<boolean> | Partial<boolean>[] | undefined; createdAt?: Partial<...> | ... 1 more ... | undefined; }>'.
        Types of property 'createdAt' are incompatible.
          Type 'string | number' is not assignable to type 'Partial<boolean> | Partial<boolean>[] | undefined'.
            Type 'string' is not assignable to type 'Partial<boolean> | Partial<boolean>[] | undefined'.",
          "lineNumber": 145,
          "tsErrorLine": Array [
            "Type Error Explanation: createdAt is in the definition, this checks that an error is not thrown for defined keys",
            "Error Line [145]: FullEsDocumentFields",
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
        Object {
          "errorMessage": "Object literal may only specify known properties, and 'b' does not exist in type '{ b: string; c?: number | undefined; }[]'.",
          "lineNumber": 126,
          "tsErrorLine": Array [
            "Type Error Explanation: a is casted to an array of objects, not an object",
            "Error Line [126]: b: 'test',",
          ],
        },
        Object {
          "errorMessage": "Subsequent property declarations must have the same type.  Property 'a' must be of type 'string[] | undefined', but here has type 'number[] | undefined'.",
          "lineNumber": 133,
          "tsErrorLine": Array [
            "Type Error Explanation: a is a string | string[], not a number[]",
            "Error Line [133]: a?: number[];",
          ],
        },
      ]
    `);
  });
});
