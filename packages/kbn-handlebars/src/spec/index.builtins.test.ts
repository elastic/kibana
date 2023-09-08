/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

/* eslint-disable max-classes-per-file */

import Handlebars from '../..';
import { expectTemplate } from '../__jest__/test_bench';

describe('builtin helpers', () => {
  describe('#if', () => {
    it('if', () => {
      const string = '{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!';

      expectTemplate(string)
        .withInput({
          goodbye: true,
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye: 'dummy',
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye: false,
          world: 'world',
        })
        .toCompileTo('cruel world!');

      expectTemplate(string).withInput({ world: 'world' }).toCompileTo('cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye: ['foo'],
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye: [],
          world: 'world',
        })
        .toCompileTo('cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye: 0,
          world: 'world',
        })
        .toCompileTo('cruel world!');

      expectTemplate('{{#if goodbye includeZero=true}}GOODBYE {{/if}}cruel {{world}}!')
        .withInput({
          goodbye: 0,
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');
    });

    it('if with function argument', () => {
      const string = '{{#if goodbye}}GOODBYE {{/if}}cruel {{world}}!';

      expectTemplate(string)
        .withInput({
          goodbye() {
            return true;
          },
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye() {
            return this.world;
          },
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye() {
            return false;
          },
          world: 'world',
        })
        .toCompileTo('cruel world!');

      expectTemplate(string)
        .withInput({
          goodbye() {
            return this.foo;
          },
          world: 'world',
        })
        .toCompileTo('cruel world!');
    });

    it('should not change the depth list', () => {
      expectTemplate('{{#with foo}}{{#if goodbye}}GOODBYE cruel {{../world}}!{{/if}}{{/with}}')
        .withInput({
          foo: { goodbye: true },
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel world!');
    });
  });

  describe('#with', () => {
    it('with', () => {
      expectTemplate('{{#with person}}{{first}} {{last}}{{/with}}')
        .withInput({
          person: {
            first: 'Alan',
            last: 'Johnson',
          },
        })
        .toCompileTo('Alan Johnson');
    });

    it('with with function argument', () => {
      expectTemplate('{{#with person}}{{first}} {{last}}{{/with}}')
        .withInput({
          person() {
            return {
              first: 'Alan',
              last: 'Johnson',
            };
          },
        })
        .toCompileTo('Alan Johnson');
    });

    it('with with else', () => {
      expectTemplate(
        '{{#with person}}Person is present{{else}}Person is not present{{/with}}'
      ).toCompileTo('Person is not present');
    });

    it('with provides block parameter', () => {
      expectTemplate('{{#with person as |foo|}}{{foo.first}} {{last}}{{/with}}')
        .withInput({
          person: {
            first: 'Alan',
            last: 'Johnson',
          },
        })
        .toCompileTo('Alan Johnson');
    });

    it('works when data is disabled', () => {
      expectTemplate('{{#with person as |foo|}}{{foo.first}} {{last}}{{/with}}')
        .withInput({ person: { first: 'Alan', last: 'Johnson' } })
        .withCompileOptions({ data: false })
        .toCompileTo('Alan Johnson');
    });
  });

  describe('#each', () => {
    it('each', () => {
      const string = '{{#each goodbyes}}{{text}}! {{/each}}cruel {{world}}!';

      expectTemplate(string)
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo('goodbye! Goodbye! GOODBYE! cruel world!');

      expectTemplate(string)
        .withInput({
          goodbyes: [],
          world: 'world',
        })
        .toCompileTo('cruel world!');
    });

    it('each without data', () => {
      expectTemplate('{{#each goodbyes}}{{text}}! {{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .withRuntimeOptions({ data: false })
        .withCompileOptions({ data: false })
        .toCompileTo('goodbye! Goodbye! GOODBYE! cruel world!');

      expectTemplate('{{#each .}}{{.}}{{/each}}')
        .withInput({ goodbyes: 'cruel', world: 'world' })
        .withRuntimeOptions({ data: false })
        .withCompileOptions({ data: false })
        .toCompileTo('cruelworld');
    });

    it('each without context', () => {
      expectTemplate('{{#each goodbyes}}{{text}}! {{/each}}cruel {{world}}!')
        .withInput(undefined)
        .toCompileTo('cruel !');
    });

    it('each with an object and @key', () => {
      const string = '{{#each goodbyes}}{{@key}}. {{text}}! {{/each}}cruel {{world}}!';

      function Clazz(this: any) {
        this['<b>#1</b>'] = { text: 'goodbye' };
        this[2] = { text: 'GOODBYE' };
      }
      Clazz.prototype.foo = 'fail';
      const hash = { goodbyes: new (Clazz as any)(), world: 'world' };

      // Object property iteration order is undefined according to ECMA spec,
      // so we need to check both possible orders
      // @see http://stackoverflow.com/questions/280713/elements-order-in-a-for-in-loop
      try {
        expectTemplate(string)
          .withInput(hash)
          .toCompileTo('&lt;b&gt;#1&lt;/b&gt;. goodbye! 2. GOODBYE! cruel world!');
      } catch (e) {
        expectTemplate(string)
          .withInput(hash)
          .toCompileTo('2. GOODBYE! &lt;b&gt;#1&lt;/b&gt;. goodbye! cruel world!');
      }

      expectTemplate(string)
        .withInput({
          goodbyes: {},
          world: 'world',
        })
        .toCompileTo('cruel world!');
    });

    it('each with @index', () => {
      expectTemplate('{{#each goodbyes}}{{@index}}. {{text}}! {{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo('0. goodbye! 1. Goodbye! 2. GOODBYE! cruel world!');
    });

    it('each with nested @index', () => {
      expectTemplate(
        '{{#each goodbyes}}{{@index}}. {{text}}! {{#each ../goodbyes}}{{@index}} {{/each}}After {{@index}} {{/each}}{{@index}}cruel {{world}}!'
      )
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo(
          '0. goodbye! 0 1 2 After 0 1. Goodbye! 0 1 2 After 1 2. GOODBYE! 0 1 2 After 2 cruel world!'
        );
    });

    it('each with block params', () => {
      expectTemplate(
        '{{#each goodbyes as |value index|}}{{index}}. {{value.text}}! {{#each ../goodbyes as |childValue childIndex|}} {{index}} {{childIndex}}{{/each}} After {{index}} {{/each}}{{index}}cruel {{world}}!'
      )
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }],
          world: 'world',
        })
        .toCompileTo('0. goodbye!  0 0 0 1 After 0 1. Goodbye!  1 0 1 1 After 1 cruel world!');
    });

    // TODO: This test has been added to the `4.x` branch of the handlebars.js repo along with a code-fix,
    // but a new version of the handlebars package containing this fix has not yet been published to npm.
    //
    // Before enabling this code, a new version of handlebars needs to be released and the corresponding
    // updates needs to be applied to this implementation.
    //
    // See: https://github.com/handlebars-lang/handlebars.js/commit/30dbf0478109ded8f12bb29832135d480c17e367
    it.skip('each with block params and strict compilation', () => {
      expectTemplate('{{#each goodbyes as |value index|}}{{index}}. {{value.text}}!{{/each}}')
        .withCompileOptions({ strict: true })
        .withInput({ goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }] })
        .toCompileTo('0. goodbye!1. Goodbye!');
    });

    it('each object with @index', () => {
      expectTemplate('{{#each goodbyes}}{{@index}}. {{text}}! {{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: {
            a: { text: 'goodbye' },
            b: { text: 'Goodbye' },
            c: { text: 'GOODBYE' },
          },
          world: 'world',
        })
        .toCompileTo('0. goodbye! 1. Goodbye! 2. GOODBYE! cruel world!');
    });

    it('each with @first', () => {
      expectTemplate('{{#each goodbyes}}{{#if @first}}{{text}}! {{/if}}{{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo('goodbye! cruel world!');
    });

    it('each with nested @first', () => {
      expectTemplate(
        '{{#each goodbyes}}({{#if @first}}{{text}}! {{/if}}{{#each ../goodbyes}}{{#if @first}}{{text}}!{{/if}}{{/each}}{{#if @first}} {{text}}!{{/if}}) {{/each}}cruel {{world}}!'
      )
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo('(goodbye! goodbye! goodbye!) (goodbye!) (goodbye!) cruel world!');
    });

    it('each object with @first', () => {
      expectTemplate('{{#each goodbyes}}{{#if @first}}{{text}}! {{/if}}{{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: { foo: { text: 'goodbye' }, bar: { text: 'Goodbye' } },
          world: 'world',
        })
        .toCompileTo('goodbye! cruel world!');
    });

    it('each with @last', () => {
      expectTemplate('{{#each goodbyes}}{{#if @last}}{{text}}! {{/if}}{{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo('GOODBYE! cruel world!');
    });

    it('each object with @last', () => {
      expectTemplate('{{#each goodbyes}}{{#if @last}}{{text}}! {{/if}}{{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: { foo: { text: 'goodbye' }, bar: { text: 'Goodbye' } },
          world: 'world',
        })
        .toCompileTo('Goodbye! cruel world!');
    });

    it('each with nested @last', () => {
      expectTemplate(
        '{{#each goodbyes}}({{#if @last}}{{text}}! {{/if}}{{#each ../goodbyes}}{{#if @last}}{{text}}!{{/if}}{{/each}}{{#if @last}} {{text}}!{{/if}}) {{/each}}cruel {{world}}!'
      )
        .withInput({
          goodbyes: [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }],
          world: 'world',
        })
        .toCompileTo('(GOODBYE!) (GOODBYE!) (GOODBYE! GOODBYE! GOODBYE!) cruel world!');
    });

    it('each with function argument', () => {
      const string = '{{#each goodbyes}}{{text}}! {{/each}}cruel {{world}}!';

      expectTemplate(string)
        .withInput({
          goodbyes() {
            return [{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }];
          },
          world: 'world',
        })
        .toCompileTo('goodbye! Goodbye! GOODBYE! cruel world!');

      expectTemplate(string)
        .withInput({
          goodbyes: [],
          world: 'world',
        })
        .toCompileTo('cruel world!');
    });

    it('each object when last key is an empty string', () => {
      expectTemplate('{{#each goodbyes}}{{@index}}. {{text}}! {{/each}}cruel {{world}}!')
        .withInput({
          goodbyes: {
            a: { text: 'goodbye' },
            b: { text: 'Goodbye' },
            '': { text: 'GOODBYE' },
          },
          world: 'world',
        })
        .toCompileTo('0. goodbye! 1. Goodbye! 2. GOODBYE! cruel world!');
    });

    it('data passed to helpers', () => {
      expectTemplate('{{#each letters}}{{this}}{{detectDataInsideEach}}{{/each}}')
        .withInput({ letters: ['a', 'b', 'c'] })
        .withHelper('detectDataInsideEach', function (options) {
          return options.data && options.data.exclaim;
        })
        .withRuntimeOptions({
          data: {
            exclaim: '!',
          },
        })
        .toCompileTo('a!b!c!');
    });

    it('each on implicit context', () => {
      expectTemplate('{{#each}}{{text}}! {{/each}}cruel world!').toThrow(Handlebars.Exception);
    });

    it('each on iterable', () => {
      class Iterator {
        private arr: any[];
        private index: number = 0;

        constructor(arr: any[]) {
          this.arr = arr;
        }

        next() {
          const value = this.arr[this.index];
          const done = this.index === this.arr.length;
          if (!done) {
            this.index++;
          }
          return { value, done };
        }
      }

      class Iterable {
        private arr: any[];

        constructor(arr: any[]) {
          this.arr = arr;
        }

        [Symbol.iterator]() {
          return new Iterator(this.arr);
        }
      }

      const string = '{{#each goodbyes}}{{text}}! {{/each}}cruel {{world}}!';

      expectTemplate(string)
        .withInput({
          goodbyes: new Iterable([{ text: 'goodbye' }, { text: 'Goodbye' }, { text: 'GOODBYE' }]),
          world: 'world',
        })
        .toCompileTo('goodbye! Goodbye! GOODBYE! cruel world!');

      expectTemplate(string)
        .withInput({
          goodbyes: new Iterable([]),
          world: 'world',
        })
        .toCompileTo('cruel world!');
    });
  });

  describe('#log', function () {
    /* eslint-disable no-console */
    let $log: typeof console.log;
    let $info: typeof console.info;
    let $error: typeof console.error;

    beforeEach(function () {
      $log = console.log;
      $info = console.info;
      $error = console.error;

      global.kbnHandlebarsEnv = Handlebars.create();
    });

    afterEach(function () {
      console.log = $log;
      console.info = $info;
      console.error = $error;

      global.kbnHandlebarsEnv = null;
    });

    it('should call logger at default level', function () {
      let levelArg;
      let logArg;
      kbnHandlebarsEnv!.log = function (level, arg) {
        levelArg = level;
        logArg = arg;
      };

      expectTemplate('{{log blah}}').withInput({ blah: 'whee' }).toCompileTo('');
      expect(1).toEqual(levelArg);
      expect('whee').toEqual(logArg);
    });

    it('should call logger at data level', function () {
      let levelArg;
      let logArg;
      kbnHandlebarsEnv!.log = function (level, arg) {
        levelArg = level;
        logArg = arg;
      };

      expectTemplate('{{log blah}}')
        .withInput({ blah: 'whee' })
        .withRuntimeOptions({ data: { level: '03' } })
        .withCompileOptions({ data: true })
        .toCompileTo('');
      expect('03').toEqual(levelArg);
      expect('whee').toEqual(logArg);
    });

    it('should output to info', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      console.info = function (info) {
        expect('whee').toEqual(info);
        calls++;
        if (calls === callsExpected) {
          console.info = $info;
          console.log = $log;
        }
      };
      console.log = function (log) {
        expect('whee').toEqual(log);
        calls++;
        if (calls === callsExpected) {
          console.info = $info;
          console.log = $log;
        }
      };

      expectTemplate('{{log blah}}').withInput({ blah: 'whee' }).toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    it('should log at data level', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      console.error = function (log) {
        expect('whee').toEqual(log);
        calls++;
        if (calls === callsExpected) console.error = $error;
      };

      expectTemplate('{{log blah}}')
        .withInput({ blah: 'whee' })
        .withRuntimeOptions({ data: { level: '03' } })
        .withCompileOptions({ data: true })
        .toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    it('should handle missing logger', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      // @ts-expect-error
      console.error = undefined;
      console.log = function (log) {
        expect('whee').toEqual(log);
        calls++;
        if (calls === callsExpected) console.log = $log;
      };

      expectTemplate('{{log blah}}')
        .withInput({ blah: 'whee' })
        .withRuntimeOptions({ data: { level: '03' } })
        .withCompileOptions({ data: true })
        .toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    it('should handle string log levels', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      console.error = function (log) {
        expect('whee').toEqual(log);
        calls++;
      };

      expectTemplate('{{log blah}}')
        .withInput({ blah: 'whee' })
        .withRuntimeOptions({ data: { level: 'error' } })
        .withCompileOptions({ data: true })
        .toCompileTo('');
      expect(calls).toEqual(callsExpected);

      calls = 0;

      expectTemplate('{{log blah}}')
        .withInput({ blah: 'whee' })
        .withRuntimeOptions({ data: { level: 'ERROR' } })
        .withCompileOptions({ data: true })
        .toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    it('should handle hash log levels [1]', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      console.error = function (log) {
        expect('whee').toEqual(log);
        calls++;
      };

      expectTemplate('{{log blah level="error"}}').withInput({ blah: 'whee' }).toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    it('should handle hash log levels [2]', function () {
      let called = false;

      console.info =
        console.log =
        console.error =
        console.debug =
          function () {
            called = true;
            console.info = console.log = console.error = console.debug = $log;
          };

      expectTemplate('{{log blah level="debug"}}').withInput({ blah: 'whee' }).toCompileTo('');
      expect(false).toEqual(called);
    });

    it('should pass multiple log arguments', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      console.info = console.log = function (log1, log2, log3) {
        expect('whee').toEqual(log1);
        expect('foo').toEqual(log2);
        expect(1).toEqual(log3);
        calls++;
        if (calls === callsExpected) console.log = $log;
      };

      expectTemplate('{{log blah "foo" 1}}').withInput({ blah: 'whee' }).toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });

    it('should pass zero log arguments', function () {
      let calls = 0;
      const callsExpected = process.env.AST || process.env.EVAL ? 1 : 2;

      console.info = console.log = function () {
        expect(arguments.length).toEqual(0);
        calls++;
        if (calls === callsExpected) console.log = $log;
      };

      expectTemplate('{{log}}').withInput({ blah: 'whee' }).toCompileTo('');
      expect(calls).toEqual(callsExpected);
    });
    /* eslint-enable no-console */
  });

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
