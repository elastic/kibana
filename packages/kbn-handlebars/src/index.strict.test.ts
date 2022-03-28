/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectTemplate } from './__jest__/test_bench';

describe('strict', () => {
  describe('strict mode', () => {
    it('should error on missing property lookup', () => {
      expectTemplate('{{hello}}')
        .withCompileOptions({ strict: true })
        .toThrow(/"hello" not defined in/);
    });

    it('should handle explicit undefined', () => {
      expectTemplate('{{hello.bar}}')
        .withCompileOptions({ strict: true })
        .withInput({ hello: { bar: undefined } })
        .toCompileTo('');
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
  });
});
