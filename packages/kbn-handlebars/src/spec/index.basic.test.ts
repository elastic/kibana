/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars from '../..';
import { expectTemplate } from '../__jest__/test_bench';

describe('basic context', () => {
  it('most basic', () => {
    expectTemplate('{{foo}}').withInput({ foo: 'foo' }).toCompileTo('foo');
  });

  it('escaping', () => {
    expectTemplate('\\{{foo}}').withInput({ foo: 'food' }).toCompileTo('{{foo}}');
    expectTemplate('content \\{{foo}}').withInput({ foo: 'food' }).toCompileTo('content {{foo}}');
    expectTemplate('\\\\{{foo}}').withInput({ foo: 'food' }).toCompileTo('\\food');
    expectTemplate('content \\\\{{foo}}').withInput({ foo: 'food' }).toCompileTo('content \\food');
    expectTemplate('\\\\ {{foo}}').withInput({ foo: 'food' }).toCompileTo('\\\\ food');
  });

  it('compiling with a basic context', () => {
    expectTemplate('Goodbye\n{{cruel}}\n{{world}}!')
      .withInput({
        cruel: 'cruel',
        world: 'world',
      })
      .toCompileTo('Goodbye\ncruel\nworld!');
  });

  it('compiling with a string context', () => {
    expectTemplate('{{.}}{{length}}').withInput('bye').toCompileTo('bye3');
  });

  it('compiling with an undefined context', () => {
    expectTemplate('Goodbye\n{{cruel}}\n{{world.bar}}!')
      .withInput(undefined)
      .toCompileTo('Goodbye\n\n!');

    expectTemplate('{{#unless foo}}Goodbye{{../test}}{{test2}}{{/unless}}')
      .withInput(undefined)
      .toCompileTo('Goodbye');
  });

  it('comments', () => {
    expectTemplate('{{! Goodbye}}Goodbye\n{{cruel}}\n{{world}}!')
      .withInput({
        cruel: 'cruel',
        world: 'world',
      })
      .toCompileTo('Goodbye\ncruel\nworld!');

    expectTemplate('    {{~! comment ~}}      blah').toCompileTo('blah');
    expectTemplate('    {{~!-- long-comment --~}}      blah').toCompileTo('blah');
    expectTemplate('    {{! comment ~}}      blah').toCompileTo('    blah');
    expectTemplate('    {{!-- long-comment --~}}      blah').toCompileTo('    blah');
    expectTemplate('    {{~! comment}}      blah').toCompileTo('      blah');
    expectTemplate('    {{~!-- long-comment --}}      blah').toCompileTo('      blah');
  });

  it('boolean', () => {
    const string = '{{#goodbye}}GOODBYE {{/goodbye}}cruel {{world}}!';
    expectTemplate(string)
      .withInput({
        goodbye: true,
        world: 'world',
      })
      .toCompileTo('GOODBYE cruel world!');

    expectTemplate(string)
      .withInput({
        goodbye: false,
        world: 'world',
      })
      .toCompileTo('cruel world!');
  });

  it('zeros', () => {
    expectTemplate('num1: {{num1}}, num2: {{num2}}')
      .withInput({
        num1: 42,
        num2: 0,
      })
      .toCompileTo('num1: 42, num2: 0');

    expectTemplate('num: {{.}}').withInput(0).toCompileTo('num: 0');

    expectTemplate('num: {{num1/num2}}')
      .withInput({ num1: { num2: 0 } })
      .toCompileTo('num: 0');
  });

  it('false', () => {
    /* eslint-disable no-new-wrappers */
    expectTemplate('val1: {{val1}}, val2: {{val2}}')
      .withInput({
        val1: false,
        val2: new Boolean(false),
      })
      .toCompileTo('val1: false, val2: false');

    expectTemplate('val: {{.}}').withInput(false).toCompileTo('val: false');

    expectTemplate('val: {{val1/val2}}')
      .withInput({ val1: { val2: false } })
      .toCompileTo('val: false');

    expectTemplate('val1: {{{val1}}}, val2: {{{val2}}}')
      .withInput({
        val1: false,
        val2: new Boolean(false),
      })
      .toCompileTo('val1: false, val2: false');

    expectTemplate('val: {{{val1/val2}}}')
      .withInput({ val1: { val2: false } })
      .toCompileTo('val: false');
    /* eslint-enable */
  });

  it('should handle undefined and null', () => {
    expectTemplate('{{awesome undefined null}}')
      .withInput({
        awesome(_undefined: any, _null: any, options: any) {
          return (_undefined === undefined) + ' ' + (_null === null) + ' ' + typeof options;
        },
      })
      .toCompileTo('true true object');

    expectTemplate('{{undefined}}')
      .withInput({
        undefined() {
          return 'undefined!';
        },
      })
      .toCompileTo('undefined!');

    expectTemplate('{{null}}')
      .withInput({
        null() {
          return 'null!';
        },
      })
      .toCompileTo('null!');
  });

  it('newlines', () => {
    expectTemplate("Alan's\nTest").toCompileTo("Alan's\nTest");
    expectTemplate("Alan's\rTest").toCompileTo("Alan's\rTest");
  });

  it('escaping text', () => {
    expectTemplate("Awesome's").toCompileTo("Awesome's");
    expectTemplate('Awesome\\').toCompileTo('Awesome\\');
    expectTemplate('Awesome\\\\ foo').toCompileTo('Awesome\\\\ foo');
    expectTemplate('Awesome {{foo}}').withInput({ foo: '\\' }).toCompileTo('Awesome \\');
    expectTemplate(" ' ' ").toCompileTo(" ' ' ");
  });

  it('escaping expressions', () => {
    expectTemplate('{{{awesome}}}').withInput({ awesome: "&'\\<>" }).toCompileTo("&'\\<>");

    expectTemplate('{{&awesome}}').withInput({ awesome: "&'\\<>" }).toCompileTo("&'\\<>");

    expectTemplate('{{awesome}}')
      .withInput({ awesome: '&"\'`\\<>' })
      .toCompileTo('&amp;&quot;&#x27;&#x60;\\&lt;&gt;');

    expectTemplate('{{awesome}}')
      .withInput({ awesome: 'Escaped, <b> looks like: &lt;b&gt;' })
      .toCompileTo('Escaped, &lt;b&gt; looks like: &amp;lt;b&amp;gt;');
  });

  it("functions returning safestrings shouldn't be escaped", () => {
    expectTemplate('{{awesome}}')
      .withInput({
        awesome() {
          return new Handlebars.SafeString("&'\\<>");
        },
      })
      .toCompileTo("&'\\<>");
  });

  it('functions', () => {
    expectTemplate('{{awesome}}')
      .withInput({
        awesome() {
          return 'Awesome';
        },
      })
      .toCompileTo('Awesome');

    expectTemplate('{{awesome}}')
      .withInput({
        awesome() {
          return this.more;
        },
        more: 'More awesome',
      })
      .toCompileTo('More awesome');
  });

  it('functions with context argument', () => {
    expectTemplate('{{awesome frank}}')
      .withInput({
        awesome(context: any) {
          return context;
        },
        frank: 'Frank',
      })
      .toCompileTo('Frank');
  });

  it('pathed functions with context argument', () => {
    expectTemplate('{{bar.awesome frank}}')
      .withInput({
        bar: {
          awesome(context: any) {
            return context;
          },
        },
        frank: 'Frank',
      })
      .toCompileTo('Frank');
  });

  it('depthed functions with context argument', () => {
    expectTemplate('{{#with frank}}{{../awesome .}}{{/with}}')
      .withInput({
        awesome(context: any) {
          return context;
        },
        frank: 'Frank',
      })
      .toCompileTo('Frank');
  });

  it('block functions with context argument', () => {
    expectTemplate('{{#awesome 1}}inner {{.}}{{/awesome}}')
      .withInput({
        awesome(context: any, options: any) {
          return options.fn(context);
        },
      })
      .toCompileTo('inner 1');
  });

  it('depthed block functions with context argument', () => {
    expectTemplate('{{#with value}}{{#../awesome 1}}inner {{.}}{{/../awesome}}{{/with}}')
      .withInput({
        value: true,
        awesome(context: any, options: any) {
          return options.fn(context);
        },
      })
      .toCompileTo('inner 1');
  });

  it('block functions without context argument', () => {
    expectTemplate('{{#awesome}}inner{{/awesome}}')
      .withInput({
        awesome(options: any) {
          return options.fn(this);
        },
      })
      .toCompileTo('inner');
  });

  it('pathed block functions without context argument', () => {
    expectTemplate('{{#foo.awesome}}inner{{/foo.awesome}}')
      .withInput({
        foo: {
          awesome() {
            return this;
          },
        },
      })
      .toCompileTo('inner');
  });

  it('depthed block functions without context argument', () => {
    expectTemplate('{{#with value}}{{#../awesome}}inner{{/../awesome}}{{/with}}')
      .withInput({
        value: true,
        awesome() {
          return this;
        },
      })
      .toCompileTo('inner');
  });

  it('paths with hyphens', () => {
    expectTemplate('{{foo-bar}}').withInput({ 'foo-bar': 'baz' }).toCompileTo('baz');

    expectTemplate('{{foo.foo-bar}}')
      .withInput({ foo: { 'foo-bar': 'baz' } })
      .toCompileTo('baz');

    expectTemplate('{{foo/foo-bar}}')
      .withInput({ foo: { 'foo-bar': 'baz' } })
      .toCompileTo('baz');
  });

  it('nested paths', () => {
    expectTemplate('Goodbye {{alan/expression}} world!')
      .withInput({ alan: { expression: 'beautiful' } })
      .toCompileTo('Goodbye beautiful world!');
  });

  it('nested paths with empty string value', () => {
    expectTemplate('Goodbye {{alan/expression}} world!')
      .withInput({ alan: { expression: '' } })
      .toCompileTo('Goodbye  world!');
  });

  it('literal paths', () => {
    expectTemplate('Goodbye {{[@alan]/expression}} world!')
      .withInput({ '@alan': { expression: 'beautiful' } })
      .toCompileTo('Goodbye beautiful world!');

    expectTemplate('Goodbye {{[foo bar]/expression}} world!')
      .withInput({ 'foo bar': { expression: 'beautiful' } })
      .toCompileTo('Goodbye beautiful world!');
  });

  it('literal references', () => {
    expectTemplate('Goodbye {{[foo bar]}} world!')
      .withInput({ 'foo bar': 'beautiful' })
      .toCompileTo('Goodbye beautiful world!');

    expectTemplate('Goodbye {{"foo bar"}} world!')
      .withInput({ 'foo bar': 'beautiful' })
      .toCompileTo('Goodbye beautiful world!');

    expectTemplate("Goodbye {{'foo bar'}} world!")
      .withInput({ 'foo bar': 'beautiful' })
      .toCompileTo('Goodbye beautiful world!');

    expectTemplate('Goodbye {{"foo[bar"}} world!')
      .withInput({ 'foo[bar': 'beautiful' })
      .toCompileTo('Goodbye beautiful world!');

    expectTemplate('Goodbye {{"foo\'bar"}} world!')
      .withInput({ "foo'bar": 'beautiful' })
      .toCompileTo('Goodbye beautiful world!');

    expectTemplate("Goodbye {{'foo\"bar'}} world!")
      .withInput({ 'foo"bar': 'beautiful' })
      .toCompileTo('Goodbye beautiful world!');
  });

  it("that current context path ({{.}}) doesn't hit helpers", () => {
    expectTemplate('test: {{.}}')
      .withInput(null)
      // @ts-expect-error Setting the helper to a string instead of a function doesn't make sense normally, but here it doesn't matter
      .withHelpers({ helper: 'awesome' })
      .toCompileTo('test: ');
  });

  it('complex but empty paths', () => {
    expectTemplate('{{person/name}}')
      .withInput({ person: { name: null } })
      .toCompileTo('');

    expectTemplate('{{person/name}}').withInput({ person: {} }).toCompileTo('');
  });

  it('this keyword in paths', () => {
    expectTemplate('{{#goodbyes}}{{this}}{{/goodbyes}}')
      .withInput({ goodbyes: ['goodbye', 'Goodbye', 'GOODBYE'] })
      .toCompileTo('goodbyeGoodbyeGOODBYE');

    expectTemplate('{{#hellos}}{{this/text}}{{/hellos}}')
      .withInput({
        hellos: [{ text: 'hello' }, { text: 'Hello' }, { text: 'HELLO' }],
      })
      .toCompileTo('helloHelloHELLO');
  });

  it('this keyword nested inside path', () => {
    expectTemplate('{{#hellos}}{{text/this/foo}}{{/hellos}}').toThrow(
      'Invalid path: text/this - 1:13'
    );

    expectTemplate('{{[this]}}').withInput({ this: 'bar' }).toCompileTo('bar');

    expectTemplate('{{text/[this]}}')
      .withInput({ text: { this: 'bar' } })
      .toCompileTo('bar');
  });

  it('this keyword in helpers', () => {
    const helpers = {
      foo(value: any) {
        return 'bar ' + value;
      },
    };

    expectTemplate('{{#goodbyes}}{{foo this}}{{/goodbyes}}')
      .withInput({ goodbyes: ['goodbye', 'Goodbye', 'GOODBYE'] })
      .withHelpers(helpers)
      .toCompileTo('bar goodbyebar Goodbyebar GOODBYE');

    expectTemplate('{{#hellos}}{{foo this/text}}{{/hellos}}')
      .withInput({
        hellos: [{ text: 'hello' }, { text: 'Hello' }, { text: 'HELLO' }],
      })
      .withHelpers(helpers)
      .toCompileTo('bar hellobar Hellobar HELLO');
  });

  it('this keyword nested inside helpers param', () => {
    expectTemplate('{{#hellos}}{{foo text/this/foo}}{{/hellos}}').toThrow(
      'Invalid path: text/this - 1:17'
    );

    expectTemplate('{{foo [this]}}')
      .withInput({
        foo(value: any) {
          return value;
        },
        this: 'bar',
      })
      .toCompileTo('bar');

    expectTemplate('{{foo text/[this]}}')
      .withInput({
        foo(value: any) {
          return value;
        },
        text: { this: 'bar' },
      })
      .toCompileTo('bar');
  });

  it('pass string literals', () => {
    expectTemplate('{{"foo"}}').toCompileTo('');
    expectTemplate('{{"foo"}}').withInput({ foo: 'bar' }).toCompileTo('bar');

    expectTemplate('{{#"foo"}}{{.}}{{/"foo"}}')
      .withInput({
        foo: ['bar', 'baz'],
      })
      .toCompileTo('barbaz');
  });

  it('pass number literals', () => {
    expectTemplate('{{12}}').toCompileTo('');
    expectTemplate('{{12}}').withInput({ '12': 'bar' }).toCompileTo('bar');
    expectTemplate('{{12.34}}').toCompileTo('');
    expectTemplate('{{12.34}}').withInput({ '12.34': 'bar' }).toCompileTo('bar');
    expectTemplate('{{12.34 1}}')
      .withInput({
        '12.34'(arg: any) {
          return 'bar' + arg;
        },
      })
      .toCompileTo('bar1');
  });

  it('pass boolean literals', () => {
    expectTemplate('{{true}}').toCompileTo('');
    expectTemplate('{{true}}').withInput({ '': 'foo' }).toCompileTo('');
    expectTemplate('{{false}}').withInput({ false: 'foo' }).toCompileTo('foo');
  });

  it('should handle literals in subexpression', () => {
    expectTemplate('{{foo (false)}}')
      .withInput({
        false() {
          return 'bar';
        },
      })
      .withHelper('foo', function (arg) {
        return arg;
      })
      .toCompileTo('bar');
  });
});
