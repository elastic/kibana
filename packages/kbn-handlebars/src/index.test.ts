/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars from './';

test('Handlebars.create', () => {
  expect(Handlebars.create()).toMatchSnapshot();
});

describe('Handlebars.compileAST', () => {
  const testCases: [[string, string, object, string]] = [
    ['valid simple template', '{{value}}', { value: 42 }, '42'],
  ];

  for (const [testName, template, context, outputExpected] of testCases) {
    test(testName, () => {
      const outputEval = Handlebars.compile(template)(context);
      const outputAST = Handlebars.compileAST(template)(context);

      expect(outputAST).toEqual(outputExpected);
      expect(outputAST).toEqual(outputEval);
    });
  }

  test('invalid template', () => {
    const template = '{{value';
    const context = { value: 42 };

    const renderEval = Handlebars.compile(template);
    expect(() => renderEval(context)).toThrowErrorMatchingSnapshot();

    const renderAST = Handlebars.compileAST(template);
    expect(() => renderAST(context)).toThrowErrorMatchingSnapshot();
  });
});

describe('Handlebars.registerHelpers', () => {
  test('lookup', () => {
    const hbar = Handlebars.create();

    hbar.registerHelper('split', (...args) => {
      const [str, splitter] = args.slice(0, -1) as [string, string];
      if (typeof splitter !== 'string')
        throw new Error('[split] "splitter" expected to be a string');
      return String(str).split(splitter);
    });

    const template =
      'https://elastic.co/{{lookup (split value ",") 0 }}&{{lookup (split value ",") 1 }}';
    const context = { value: '47.766201,-122.257057' };
    const outputExpected = 'https://elastic.co/47.766201&-122.257057';

    const outputAST = hbar.compileAST(template)(context);
    const outputEval = hbar.compile(template)(context);

    expect(outputAST).toEqual(outputExpected);
    expect(outputAST).toEqual(outputEval);
  });
});
