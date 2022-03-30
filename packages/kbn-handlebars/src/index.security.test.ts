/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars from '.';
import { expectTemplate } from './__jest__/test_bench';

describe('security issues', () => {
  describe('GH-1495: Prevent Remote Code Execution via constructor', () => {
    it('should allow the "constructor" property to be accessed if it is an "ownProperty"', () => {
      expectTemplate('{{constructor.name}}')
        .withInput({ constructor: { name: 'here we go' } })
        .toCompileTo('here we go');

      expectTemplate('{{lookup (lookup this "constructor") "name"}}')
        .withInput({ constructor: { name: 'here we go' } })
        .toCompileTo('here we go');
    });

    it('should allow the "constructor" property to be accessed if it is an "own property"', () => {
      expectTemplate('{{lookup (lookup this "constructor") "name"}}')
        .withInput({ constructor: { name: 'here we go' } })
        .toCompileTo('here we go');
    });
  });

  describe('GH-1558: Prevent explicit call of helperMissing-helpers', () => {
    describe('without the option "allowExplicitCallOfHelperMissing"', () => {
      it('should throw an exception when calling  "{{helperMissing}}" ', () => {
        expectTemplate('{{helperMissing}}').toThrow(Error);
      });

      it('should throw an exception when calling  "{{#helperMissing}}{{/helperMissing}}" ', () => {
        expectTemplate('{{#helperMissing}}{{/helperMissing}}').toThrow(Error);
      });

      it('should throw an exception when calling  "{{blockHelperMissing "abc" .}}" ', () => {
        const functionCalls = [];
        expect(() => {
          const template = Handlebars.compile('{{blockHelperMissing "abc" .}}');
          template({
            fn() {
              functionCalls.push('called');
            },
          });
        }).toThrow(Error);
        expect(functionCalls.length).toEqual(0);
      });

      it('should throw an exception when calling  "{{#blockHelperMissing .}}{{/blockHelperMissing}}"', () => {
        expectTemplate('{{#blockHelperMissing .}}{{/blockHelperMissing}}')
          .withInput({
            fn() {
              return 'functionInData';
            },
          })
          .toThrow(Error);
      });
    });
  });

  describe('escapes template variables', () => {
    it('in default mode', () => {
      expectTemplate("{{'a\\b'}}").withCompileOptions().withInput({ 'a\\b': 'c' }).toCompileTo('c');
    });

    it('in strict mode', () => {
      expectTemplate("{{'a\\b'}}")
        .withCompileOptions({ strict: true })
        .withInput({ 'a\\b': 'c' })
        .toCompileTo('c');
    });
  });
});
