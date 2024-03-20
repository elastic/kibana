/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { validate, ignoreErrorsMap } from './validation';

interface Fixtures {
  indexes: string[];
  fields: Array<{ name: string; type: string }>;
  policies: Array<{
    name: string;
    sourceIndices: string[];
    matchField: string;
    enrichFields: string[];
  }>;
  unsupported_field: Array<{ name: string; type: string }>;
  enrichFields: Array<{ name: string; type: string }>;
  testCases: Array<{ query: string; error: string[] }>;
}

function loadFixtures() {
  const esqlPackagePath = Path.resolve(
    REPO_ROOT,
    'packages',
    'kbn-esql-ast-core',
    'src',
    'lib',
    'ast',
    'validation',
    'esql_validation_meta_tests.json'
  );
  const json = Fs.readFileSync(esqlPackagePath, 'utf8');
  const esqlPackage = JSON.parse(json);
  return esqlPackage as Fixtures;
}

function excludeErrorsByContent(excludedCallback: Array<keyof typeof ignoreErrorsMap>) {
  const contentByCallback = {
    getSources: /Unknown index/,
    getPolicies: /Unknown policy/,
    getFieldsFor: /Unknown column|Argument of|it is unsupported or not indexed/,
    getMetaFields: /Metadata field/,
    getPolicyFields: undefined,
    getPolicyMatchingField: undefined,
  };
  return excludedCallback.map((callback) => contentByCallback[callback]) || [];
}

function getCallbackMocks(fixtures: Fixtures, exclude?: string) {
  return {
    getFieldsFor: jest.fn(async ({ query }) => {
      if (/enrich/.test(query)) {
        return fixtures.enrichFields;
      }
      if (/unsupported_index/.test(query)) {
        return fixtures.unsupported_field;
      }
      if (/dissect|grok/.test(query)) {
        return [{ name: 'firstWord', type: 'string' }];
      }
      return fixtures.fields;
    }),
    getSources: jest.fn(async () =>
      fixtures.indexes.map((name) => ({
        name,
        hidden: name.startsWith('.'),
      }))
    ),
    getPolicies: jest.fn(async () => fixtures.policies),
    getMetaFields: jest.fn(async () => ['_id', '_source']),
    ...(exclude ? { [exclude]: undefined } : {}),
  };
}

describe('ES|QL public validation', () => {
  let fixtures: Fixtures = {
    indexes: [],
    fields: [],
    policies: [],
    unsupported_field: [],
    enrichFields: [],
    testCases: [],
  };
  beforeAll(() => {
    fixtures = loadFixtures();
  });

  it('should the injection of a custom AST provider', async () => {
    const astProvider = async (text: string | undefined) => ({
      errors: [
        {
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: 1,
          endColumn: 1,
          message: 'My custom error',
          code: 'customError',
          severity: 'error' as const,
        },
      ],
      ast: [],
    });
    const { errors } = await validate(
      fixtures.testCases[0].query,
      astProvider,
      getCallbackMocks(fixtures)
    );
    expect(errors.length).toBe(1);
    expect(errors[0].text).toBe('My custom error');
  });

  it('should basically work when all callbacks are passed', async () => {
    const allErrors = await Promise.all(
      fixtures.testCases
        .filter(({ query }) => query === 'from index [METADATA _id, _source2]')
        .map(({ query }) => validate(query, undefined, getCallbackMocks(fixtures)))
    );
    for (const [index, { errors }] of Object.entries(allErrors)) {
      expect(errors.map((e) => e.text)).toEqual(
        fixtures.testCases.filter(({ query }) => query === 'from index [METADATA _id, _source2]')[
          Number(index)
        ].error
      );
    }
  });

  // test excluding one callback at the time
  it.each(['getSources', 'getFieldsFor', 'getPolicies', 'getMetaFields'] as Array<
    keyof typeof ignoreErrorsMap
  >)(`should not error if %s is missing`, async (excludedCallback) => {
    const filteredTestCases = fixtures.testCases.filter((t) =>
      t.error.some((message) =>
        excludeErrorsByContent([excludedCallback]).every((regexp) => regexp?.test(message))
      )
    );
    const allErrors = await Promise.all(
      filteredTestCases.map(({ query }) =>
        validate(query, undefined, getCallbackMocks(fixtures, excludedCallback))
      )
    );
    for (const { errors } of allErrors) {
      expect(
        errors.every(({ code }) =>
          ignoreErrorsMap[excludedCallback].every((ignoredCode) => ignoredCode !== code)
        )
      ).toBe(true);
    }
  });

  it('should work if no callback passed', async () => {
    const excludedCallbacks = [
      'getSources',
      'getPolicies',
      'getFieldsFor',
      'getMetaFields',
      'getPolicyFields',
      'getPolicyMatchingField',
    ] as Array<keyof typeof ignoreErrorsMap>;
    for (const testCase of fixtures.testCases.filter((t) =>
      t.error.some((message) =>
        excludeErrorsByContent(excludedCallbacks).every((regexp) => regexp?.test(message))
      )
    )) {
      const { errors } = await validate(testCase.query, undefined);
      expect(
        errors.every(({ code }) =>
          Object.values(ignoreErrorsMap)
            .filter(<T>(v: T): v is NonNullable<T> => v != null)
            .every((ignoredCode) => ignoredCode.every((i) => i !== code))
        )
      ).toBe(true);
    }
  });
});
