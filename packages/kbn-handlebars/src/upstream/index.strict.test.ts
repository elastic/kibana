/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import { expectTemplate } from '../__jest__/test_bench';

describe('strict', () => {
  describe('strict mode', () => {
    it('should error on missing property lookup', () => {
      expectTemplate('{{hello}}')
        .withCompileOptions({ strict: true })
        .toThrow(/"hello" not defined in/);
    });

    it('should error on missing child', () => {
      expectTemplate('{{hello.bar}}')
        .withCompileOptions({ strict: true })
        .withInput({ hello: { bar: 'foo' } })
        .toCompileTo('foo');

      expectTemplate('{{hello.bar}}')
        .withCompileOptions({ strict: true })
        .withInput({ hello: {} })
        .toThrow(/"bar" not defined in/);
    });

    it('should handle explicit undefined', () => {
      expectTemplate('{{hello.bar}}')
        .withCompileOptions({ strict: true })
        .withInput({ hello: { bar: undefined } })
        .toCompileTo('');
    });

    it('should error on missing property lookup in known helpers mode', () => {
      expectTemplate('{{hello}}')
        .withCompileOptions({
          strict: true,
          knownHelpersOnly: true,
        })
        .toThrow(/"hello" not defined in/);
    });

    it('should error on missing context', () => {
      expectTemplate('{{hello}}').withCompileOptions({ strict: true }).toThrow(Error);
    });

    it('should error on missing data lookup', () => {
      const xt = expectTemplate('{{@hello}}').withCompileOptions({
        strict: true,
      });

      xt.toThrow(Error);

      xt.withRuntimeOptions({ data: { hello: 'foo' } }).toCompileTo('foo');
    });

    it('should not run helperMissing for helper calls', () => {
      expectTemplate('{{hello foo}}')
        .withCompileOptions({ strict: true })
        .withInput({ foo: true })
        .toThrow(/"hello" not defined in/);

      expectTemplate('{{#hello foo}}{{/hello}}')
        .withCompileOptions({ strict: true })
        .withInput({ foo: true })
        .toThrow(/"hello" not defined in/);
    });

    it('should throw on ambiguous blocks', () => {
      expectTemplate('{{#hello}}{{/hello}}')
        .withCompileOptions({ strict: true })
        .toThrow(/"hello" not defined in/);

      expectTemplate('{{^hello}}{{/hello}}')
        .withCompileOptions({ strict: true })
        .toThrow(/"hello" not defined in/);

      expectTemplate('{{#hello.bar}}{{/hello.bar}}')
        .withCompileOptions({ strict: true })
        .withInput({ hello: {} })
        .toThrow(/"bar" not defined in/);
    });

    it('should allow undefined parameters when passed to helpers', () => {
      expectTemplate('{{#unless foo}}success{{/unless}}')
        .withCompileOptions({ strict: true })
        .toCompileTo('success');
    });

    it('should allow undefined hash when passed to helpers', () => {
      expectTemplate('{{helper value=@foo}}')
        .withCompileOptions({
          strict: true,
        })
        .withHelpers({
          helper(options) {
            expect('value' in options.hash).toEqual(true);
            expect(options.hash.value).toBeUndefined();
            return 'success';
          },
        })
        .toCompileTo('success');
    });

    it('should show error location on missing property lookup', () => {
      expectTemplate('\n\n\n   {{hello}}')
        .withCompileOptions({ strict: true })
        .toThrow('"hello" not defined in [object Object] - 4:5');
    });

    it('should error contains correct location properties on missing property lookup', () => {
      try {
        expectTemplate('\n\n\n   {{hello}}')
          .withCompileOptions({ strict: true })
          .toCompileTo('throw before asserting this');
      } catch (error) {
        expect(error.lineNumber).toEqual(4);
        expect(error.endLineNumber).toEqual(4);
        expect(error.column).toEqual(5);
        expect(error.endColumn).toEqual(10);
      }
    });
  });

  describe('assume objects', () => {
    it('should ignore missing property', () => {
      expectTemplate('{{hello}}').withCompileOptions({ assumeObjects: true }).toCompileTo('');
    });

    it('should ignore missing child', () => {
      expectTemplate('{{hello.bar}}')
        .withCompileOptions({ assumeObjects: true })
        .withInput({ hello: {} })
        .toCompileTo('');
    });

    it('should error on missing object', () => {
      expectTemplate('{{hello.bar}}').withCompileOptions({ assumeObjects: true }).toThrow(Error);
    });

    it('should error on missing context', () => {
      expectTemplate('{{hello}}')
        .withCompileOptions({ assumeObjects: true })
        .withInput(undefined)
        .toThrow(Error);
    });

    it('should error on missing data lookup', () => {
      expectTemplate('{{@hello.bar}}')
        .withCompileOptions({ assumeObjects: true })
        .withInput(undefined)
        .toThrow(Error);
    });

    it('should execute blockHelperMissing', () => {
      expectTemplate('{{^hello}}foo{{/hello}}')
        .withCompileOptions({ assumeObjects: true })
        .toCompileTo('foo');
    });
  });
});
