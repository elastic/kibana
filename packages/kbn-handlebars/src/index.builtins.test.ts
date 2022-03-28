/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import Handlebars from '.';
import { expectTemplate } from './__jest__/test_bench';

describe('builtin helpers', () => {
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
        .withCompileOptions({ data: false }) // TODO: We do not take data on compile options into account
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
