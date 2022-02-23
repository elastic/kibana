/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars from '.';
import { expectTemplate } from './__jest__/test_bench';

test('Handlebars.create', () => {
  expect(Handlebars.create()).toMatchSnapshot();
});

describe('Handlebars.compileAST', () => {
  const testCases: [[string, string, object, string]] = [
    ['valid simple template', '{{value}}', { value: 42 }, '42'],
  ];

  for (const [testName, template, context, outputExpected] of testCases) {
    test(testName, () => {
      expectTemplate(template).withInput(context).toCompileTo(outputExpected);
    });
  }

  describe('compiler options', () => {
    test('noEscape', () => {
      expectTemplate('{{value}}').withInput({ value: '<foo>' }).toCompileTo('&lt;foo&gt;');

      expectTemplate('{{value}}')
        .withCompileOptions({ noEscape: false })
        .withInput({ value: '<foo>' })
        .toCompileTo('&lt;foo&gt;');

      expectTemplate('{{value}}')
        .withCompileOptions({ noEscape: true })
        .withInput({ value: '<foo>' })
        .toCompileTo('<foo>');
    });
  });

  test('invalid template', () => {
    expectTemplate('{{value').withInput({ value: 42 }).toThrowErrorMatchingSnapshot();
  });
});

test('Handlebars.registerHelpers', () => {
  expectTemplate(
    'https://elastic.co/{{lookup (split value ",") 0 }}&{{lookup (split value ",") 1 }}'
  )
    .withHelper('split', (...args) => {
      const [str, splitter] = args.slice(0, -1) as [string, string];
      if (typeof splitter !== 'string')
        throw new Error('[split] "splitter" expected to be a string');
      return String(str).split(splitter);
    })
    .withInput({ value: '47.766201,-122.257057' })
    .toCompileTo('https://elastic.co/47.766201&-122.257057');
});
