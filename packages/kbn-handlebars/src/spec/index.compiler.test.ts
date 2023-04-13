/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars from '../..';
import { forEachCompileFunctionName } from '../__jest__/test_bench';

describe('compiler', () => {
  forEachCompileFunctionName((compileName) => {
    const compile = Handlebars[compileName].bind(Handlebars);

    describe(`#${compileName}`, () => {
      it('should fail with invalid input', () => {
        expect(function () {
          compile(null);
        }).toThrow(
          `You must pass a string or Handlebars AST to Handlebars.${compileName}. You passed null`
        );

        expect(function () {
          compile({});
        }).toThrow(
          `You must pass a string or Handlebars AST to Handlebars.${compileName}. You passed [object Object]`
        );
      });

      it('should include the location in the error (row and column)', () => {
        try {
          compile(' \n  {{#if}}\n{{/def}}')();
          expect(true).toEqual(false);
        } catch (err) {
          expect(err.message).toEqual("if doesn't match def - 2:5");
          if (Object.getOwnPropertyDescriptor(err, 'column')!.writable) {
            // In Safari 8, the column-property is read-only. This means that even if it is set with defineProperty,
            // its value won't change (https://github.com/jquery/esprima/issues/1290#issuecomment-132455482)
            // Since this was neither working in Handlebars 3 nor in 4.0.5, we only check the column for other browsers.
            expect(err.column).toEqual(5);
          }
          expect(err.lineNumber).toEqual(2);
        }
      });

      it('should include the location as enumerable property', () => {
        try {
          compile(' \n  {{#if}}\n{{/def}}')();
          expect(true).toEqual(false);
        } catch (err) {
          expect(Object.prototype.propertyIsEnumerable.call(err, 'column')).toEqual(true);
        }
      });

      it('can utilize AST instance', () => {
        expect(
          compile({
            type: 'Program',
            body: [{ type: 'ContentStatement', value: 'Hello' }],
          })()
        ).toEqual('Hello');
      });

      it('can pass through an empty string', () => {
        expect(compile('')()).toEqual('');
      });

      it('should not modify the options.data property(GH-1327)', () => {
        // The `data` property is supposed to be a boolean, but in this test we want to ignore that
        const options = { data: [{ a: 'foo' }, { a: 'bar' }] as unknown as boolean };
        compile('{{#each data}}{{@index}}:{{a}} {{/each}}', options)();
        expect(JSON.stringify(options, null, 2)).toEqual(
          JSON.stringify({ data: [{ a: 'foo' }, { a: 'bar' }] }, null, 2)
        );
      });

      it('should not modify the options.knownHelpers property(GH-1327)', () => {
        const options = { knownHelpers: {} };
        compile('{{#each data}}{{@index}}:{{a}} {{/each}}', options)();
        expect(JSON.stringify(options, null, 2)).toEqual(
          JSON.stringify({ knownHelpers: {} }, null, 2)
        );
      });
    });
  });
});
