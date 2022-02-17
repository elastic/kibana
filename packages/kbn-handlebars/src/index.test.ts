/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars, { HelperDelegate } from './';

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

  test('invalid template', () => {
    expectTemplate('{{value').withInput({ value: 42 }).toThrowErrorMatchingSnapshot();
  });
});

describe('builtin helpers', () => {
  describe('#lookup', () => {
    it('should lookup arbitrary content', () => {
      expectTemplate('{{#each goodbyes}}{{lookup ../data .}}{{/each}}')
        .withInput({ goodbyes: [0, 1], data: ['foo', 'bar'] })
        .toCompileTo('foobar');
    });

    it('should not fail on undefined value', () => {
      expectTemplate('{{#each goodbyes}}{{lookup ../bar .}}{{/each}}')
        .withInput({ goodbyes: [0, 1], data: ['foo', 'bar'] })
        .toCompileTo('');
    });
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

class HandlebarsTestBench {
  private template: string;
  private helpers: { [key: string]: HelperDelegate } = {};
  private input: object = {};

  constructor(template: string) {
    this.template = template;
  }

  withInput(input: object) {
    this.input = input;
    return this;
  }

  withHelper(name: string, helper: HelperDelegate) {
    this.helpers[name] = helper;
    return this;
  }

  toCompileTo(outputExpected: string) {
    const { outputEval, outputAST } = this.compileAndExecute();
    expect(outputAST).toEqual(outputExpected);
    expect(outputAST).toEqual(outputEval);
  }

  toThrowErrorMatchingSnapshot() {
    const { renderEval, renderAST } = this.compile();
    expect(() => renderEval(this.input)).toThrowErrorMatchingSnapshot();
    expect(() => renderAST(this.input)).toThrowErrorMatchingSnapshot();
  }

  private compileAndExecute() {
    const { renderEval, renderAST } = this.compile();
    return {
      outputEval: renderEval(this.input),
      outputAST: renderAST(this.input),
    };
  }

  private compile() {
    const hasCustomHelpers = Object.keys(this.helpers).length > 0;
    const hbar = hasCustomHelpers ? Handlebars.create() : Handlebars;

    if (hasCustomHelpers) {
      for (const [name, helper] of Object.entries(this.helpers)) {
        hbar.registerHelper(name, helper);
      }
    }

    return {
      renderEval: hbar.compile(this.template),
      renderAST: hbar.compileAST(this.template),
    };
  }
}

function expectTemplate(template: string) {
  return new HandlebarsTestBench(template);
}
