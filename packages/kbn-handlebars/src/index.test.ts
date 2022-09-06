/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

/**
 * ABOUT THIS FILE:
 *
 * This file is for tests not copied from the upstream handlebars project, but
 * tests that we feel are needed in order to fully cover our use-cases.
 */

import Handlebars from '.';
import { expectTemplate } from './__jest__/test_bench';

it('Handlebars.create', () => {
  expect(Handlebars.create()).toMatchSnapshot();
});

describe('Handlebars.compileAST', () => {
  describe('compiler options', () => {
    it('noEscape', () => {
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

  it('invalid template', () => {
    expectTemplate('{{value').withInput({ value: 42 }).toThrowErrorMatchingSnapshot();
  });

  if (!process.env.EVAL) {
    it('reassign', () => {
      const fn = Handlebars.compileAST;
      expect(fn('{{value}}')({ value: 42 })).toEqual('42');
    });
  }
});

it('Only provide options.fn/inverse to block helpers', () => {
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
