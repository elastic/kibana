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

    it('each without context', () => {
      expectTemplate('{{#each goodbyes}}{{text}}! {{/each}}cruel {{world}}!')
        .withInput(undefined)
        .toCompileTo('cruel !');
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
