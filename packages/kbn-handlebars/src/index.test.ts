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

test('Only provide options.fn/inverse to block helpers', () => {
  function toHaveProperties(...args: any[]) {
    toHaveProperties.calls++;
    const options = args[args.length - 1];
    expect(options).toHaveProperty('fn');
    expect(options).toHaveProperty('inverse');
    return 42;
  }
  toHaveProperties.calls = 0;

  function toNotHaveProperties(...args: any[]) {
    toNotHaveProperties.calls++;
    const options = args[args.length - 1];
    expect(options).not.toHaveProperty('fn');
    expect(options).not.toHaveProperty('inverse');
    return 42;
  }
  toNotHaveProperties.calls = 0;

  const nonBlockTemplates = ['{{foo}}', '{{foo 1 2}}'];
  const blockTemplates = ['{{#foo}}42{{/foo}}', '{{#foo 1 2}}42{{/foo}}'];

  for (const template of nonBlockTemplates) {
    expectTemplate(template)
      .withInput({
        foo: toNotHaveProperties,
      })
      .toCompileTo('42');

    expectTemplate(template).withHelper('foo', toNotHaveProperties).toCompileTo('42');
  }

  for (const template of blockTemplates) {
    expectTemplate(template)
      .withInput({
        foo: toHaveProperties,
      })
      .toCompileTo('42');

    expectTemplate(template).withHelper('foo', toHaveProperties).toCompileTo('42');
  }

  expect(toNotHaveProperties.calls).toEqual(nonBlockTemplates.length * 2 * 2);
  expect(toHaveProperties.calls).toEqual(blockTemplates.length * 2 * 2);
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
