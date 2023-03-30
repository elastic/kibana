/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars from '../..';
import { expectTemplate } from '../__jest__/test_bench';

describe('security issues', () => {
  describe('GH-1495: Prevent Remote Code Execution via constructor', () => {
    it('should not allow constructors to be accessed', () => {
      expectTemplate('{{lookup (lookup this "constructor") "name"}}').withInput({}).toCompileTo('');
      expectTemplate('{{constructor.name}}').withInput({}).toCompileTo('');
    });

    it('GH-1603: should not allow constructors to be accessed (lookup via toString)', () => {
      expectTemplate('{{lookup (lookup this (list "constructor")) "name"}}')
        .withInput({})
        .withHelper('list', function (element) {
          return [element];
        })
        .toCompileTo('');
    });

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

  describe('GH-1563', () => {
    it('should not allow to access constructor after overriding via __defineGetter__', () => {
      // @ts-expect-error
      if ({}.__defineGetter__ == null || {}.__lookupGetter__ == null) {
        return; // Browser does not support this exploit anyway
      }
      expectTemplate(
        '{{__defineGetter__ "undefined" valueOf }}' +
          '{{#with __lookupGetter__ }}' +
          '{{__defineGetter__ "propertyIsEnumerable" (this.bind (this.bind 1)) }}' +
          '{{constructor.name}}' +
          '{{/with}}'
      )
        .withInput({})
        .toThrow(/Missing helper: "__defineGetter__"/);
    });
  });

  describe('GH-1595: dangerous properties', () => {
    const templates = [
      '{{constructor}}',
      '{{__defineGetter__}}',
      '{{__defineSetter__}}',
      '{{__lookupGetter__}}',
      '{{__proto__}}',
      '{{lookup this "constructor"}}',
      '{{lookup this "__defineGetter__"}}',
      '{{lookup this "__defineSetter__"}}',
      '{{lookup this "__lookupGetter__"}}',
      '{{lookup this "__proto__"}}',
    ];

    templates.forEach((template) => {
      describe('access should be denied to ' + template, () => {
        it('by default', () => {
          expectTemplate(template).withInput({}).toCompileTo('');
        });
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
