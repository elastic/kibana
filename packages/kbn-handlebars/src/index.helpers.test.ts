/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars, { HelperOptions } from '.';
import { expectTemplate } from './__jest__/test_bench';

let handlebarsEnv: typeof Handlebars;

beforeEach(() => {
  handlebarsEnv = Handlebars.create();
});

describe('helpers', () => {
  it('helper with complex lookup$', () => {
    expectTemplate('{{#goodbyes}}{{{link ../prefix}}}{{/goodbyes}}')
      .withInput({
        prefix: '/root',
        goodbyes: [{ text: 'Goodbye', url: 'goodbye' }],
      })
      .withHelper('link', function (this: any, prefix) {
        return '<a href="' + prefix + '/' + this.url + '">' + this.text + '</a>';
      })
      .toCompileTo('<a href="/root/goodbye">Goodbye</a>');
  });

  describe('raw block parsing (with identity helper-function)', () => {
    it('helper for nested raw block throw exception when with missing closing braces', () => {
      const string = '{{{{a}}}} {{{{/a';
      expectTemplate(string).toThrow();
    });
  });

  it('helper returning undefined value', () => {
    expectTemplate(' {{nothere}}')
      .withHelpers({
        nothere() {},
      })
      .toCompileTo(' ');

    expectTemplate(' {{#nothere}}{{/nothere}}')
      .withHelpers({
        nothere() {},
      })
      .toCompileTo(' ');
  });

  it('block helper for undefined value', () => {
    expectTemplate("{{#empty}}shouldn't render{{/empty}}").toCompileTo('');
  });

  describe('helpers hash', () => {
    it('providing a helpers hash', () => {
      expectTemplate('Goodbye {{cruel}} {{world}}!')
        .withInput({ cruel: 'cruel' })
        .withHelpers({
          world() {
            return 'world';
          },
        })
        .toCompileTo('Goodbye cruel world!');

      expectTemplate('Goodbye {{#iter}}{{cruel}} {{world}}{{/iter}}!')
        .withInput({ iter: [{ cruel: 'cruel' }] })
        .withHelpers({
          world() {
            return 'world';
          },
        })
        .toCompileTo('Goodbye cruel world!');
    });

    it('in cases of conflict, helpers win', () => {
      expectTemplate('{{{lookup}}}')
        .withInput({ lookup: 'Explicit' })
        .withHelpers({
          lookup() {
            return 'helpers';
          },
        })
        .toCompileTo('helpers');

      expectTemplate('{{lookup}}')
        .withInput({ lookup: 'Explicit' })
        .withHelpers({
          lookup() {
            return 'helpers';
          },
        })
        .toCompileTo('helpers');
    });

    it('the helpers hash is available is nested contexts', () => {
      expectTemplate('{{#outer}}{{#inner}}{{helper}}{{/inner}}{{/outer}}')
        .withInput({ outer: { inner: { unused: [] } } })
        .withHelpers({
          helper() {
            return 'helper';
          },
        })
        .toCompileTo('helper');
    });
  });

  describe('registration', () => {
    it('unregisters', () => {
      deleteAllKeys(handlebarsEnv!.helpers);

      handlebarsEnv!.registerHelper('foo', function () {
        return 'fail';
      });
      expect(handlebarsEnv!.helpers.foo).toBeDefined();
      handlebarsEnv!.unregisterHelper('foo');
      expect(handlebarsEnv!.helpers.foo).toBeUndefined();
    });

    it('fails with multiple and args', () => {
      expect(() => {
        handlebarsEnv!.registerHelper(
          // @ts-expect-error TypeScript is complaining about the invalid input just as the thrown error
          {
            world() {
              return 'world!';
            },
            testHelper() {
              return 'found it!';
            },
          },
          {}
        );
      }).toThrow('Arg not supported with multiple helpers');
    });
  });

  it('decimal number literals work', () => {
    expectTemplate('Message: {{hello -1.2 1.2}}')
      .withHelper('hello', function (times, times2) {
        if (typeof times !== 'number') {
          times = 'NaN';
        }
        if (typeof times2 !== 'number') {
          times2 = 'NaN';
        }
        return 'Hello ' + times + ' ' + times2 + ' times';
      })
      .toCompileTo('Message: Hello -1.2 1.2 times');
  });

  it('negative number literals work', () => {
    expectTemplate('Message: {{hello -12}}')
      .withHelper('hello', function (times) {
        if (typeof times !== 'number') {
          times = 'NaN';
        }
        return 'Hello ' + times + ' times';
      })
      .toCompileTo('Message: Hello -12 times');
  });

  describe('String literal parameters', () => {
    it('simple literals work', () => {
      expectTemplate('Message: {{hello "world" 12 true false}}')
        .withHelper('hello', function (param, times, bool1, bool2) {
          if (typeof times !== 'number') {
            times = 'NaN';
          }
          if (typeof bool1 !== 'boolean') {
            bool1 = 'NaB';
          }
          if (typeof bool2 !== 'boolean') {
            bool2 = 'NaB';
          }
          return 'Hello ' + param + ' ' + times + ' times: ' + bool1 + ' ' + bool2;
        })
        .toCompileTo('Message: Hello world 12 times: true false');
    });

    it('using a quote in the middle of a parameter raises an error', () => {
      expectTemplate('Message: {{hello wo"rld"}}').toThrow(Error);
    });

    it('escaping a String is possible', () => {
      expectTemplate('Message: {{{hello "\\"world\\""}}}')
        .withHelper('hello', function (param) {
          return 'Hello ' + param;
        })
        .toCompileTo('Message: Hello "world"');
    });

    it("it works with ' marks", () => {
      expectTemplate('Message: {{{hello "Alan\'s world"}}}')
        .withHelper('hello', function (param) {
          return 'Hello ' + param;
        })
        .toCompileTo("Message: Hello Alan's world");
    });
  });

  describe('multiple parameters', () => {
    it('simple multi-params work', () => {
      expectTemplate('Message: {{goodbye cruel world}}')
        .withInput({ cruel: 'cruel', world: 'world' })
        .withHelper('goodbye', function (cruel, world) {
          return 'Goodbye ' + cruel + ' ' + world;
        })
        .toCompileTo('Message: Goodbye cruel world');
    });

    it('block multi-params work', () => {
      expectTemplate('Message: {{#goodbye cruel world}}{{greeting}} {{adj}} {{noun}}{{/goodbye}}')
        .withInput({ cruel: 'cruel', world: 'world' })
        .withHelper('goodbye', function (cruel, world, options) {
          return options.fn({ greeting: 'Goodbye', adj: cruel, noun: world });
        })
        .toCompileTo('Message: Goodbye cruel world');
    });
  });

  describe('hash', () => {
    it('helpers can take an optional hash', () => {
      expectTemplate('{{goodbye cruel="CRUEL" world="WORLD" times=12}}')
        .withHelper('goodbye', function (options) {
          return (
            'GOODBYE ' +
            options.hash.cruel +
            ' ' +
            options.hash.world +
            ' ' +
            options.hash.times +
            ' TIMES'
          );
        })
        .toCompileTo('GOODBYE CRUEL WORLD 12 TIMES');
    });

    it('helpers can take an optional hash with booleans', () => {
      function goodbye(options: HelperOptions) {
        if (options.hash.print === true) {
          return 'GOODBYE ' + options.hash.cruel + ' ' + options.hash.world;
        } else if (options.hash.print === false) {
          return 'NOT PRINTING';
        } else {
          return 'THIS SHOULD NOT HAPPEN';
        }
      }

      expectTemplate('{{goodbye cruel="CRUEL" world="WORLD" print=true}}')
        .withHelper('goodbye', goodbye)
        .toCompileTo('GOODBYE CRUEL WORLD');

      expectTemplate('{{goodbye cruel="CRUEL" world="WORLD" print=false}}')
        .withHelper('goodbye', goodbye)
        .toCompileTo('NOT PRINTING');
    });
  });

  // The `knownHelpers` compile option ins't supported by @kbn/handlebars because it's a compile optimization flag
  // and hence isn't needed by @kbn/handlebars as we don't compile in the "eval" sense of the word
  describe('knownHelpers', () => {
    it('Known helper should render helper', () => {
      expectTemplate('{{hello}}')
        .withCompileOptions({
          knownHelpers: { hello: true },
        })
        .withHelper('hello', function () {
          return 'foo';
        })
        .toCompileTo('foo');
    });

    it('Unknown helper in knownHelpers only mode should be passed as undefined', () => {
      expectTemplate('{{typeof hello}}')
        .withCompileOptions({
          knownHelpers: { typeof: true },
          knownHelpersOnly: true,
        })
        .withHelper('typeof', function (arg) {
          return typeof arg;
        })
        .withHelper('hello', function () {
          return 'foo';
        })
        .toCompileTo('undefined');
    });

    it('Builtin helpers available in knownHelpers only mode', () => {
      expectTemplate('{{#unless foo}}bar{{/unless}}')
        .withCompileOptions({
          knownHelpersOnly: true,
        })
        .toCompileTo('bar');
    });

    it('Field lookup works in knownHelpers only mode', () => {
      expectTemplate('{{foo}}')
        .withCompileOptions({
          knownHelpersOnly: true,
        })
        .withInput({ foo: 'bar' })
        .toCompileTo('bar');
    });

    it('Unknown helper call in knownHelpers only mode should throw', () => {
      expectTemplate('{{typeof hello}}')
        .withCompileOptions({ knownHelpersOnly: true })
        .toThrow(Error);
    });
  });

  // The `blockHelperMissing` helper is only used if the `strict` compile option isn't set to `true`.
  // We do not support setting `strict: false` in @kbn/handlebars
  describe('blockHelperMissing', () => {
    it('lambdas are resolved by blockHelperMissing, not handlebars proper', () => {
      expectTemplate('{{#truthy}}yep{{/truthy}}')
        .withInput({
          truthy() {
            return true;
          },
        })
        .toCompileTo('yep');
    });

    it('lambdas resolved by blockHelperMissing are bound to the context', () => {
      expectTemplate('{{#truthy}}yep{{/truthy}}')
        .withInput({
          truthy() {
            return this.truthiness();
          },
          truthiness() {
            return false;
          },
        })
        .toCompileTo('');
    });
  });

  describe('name field', () => {
    const helpers = {
      blockHelperMissing(...args: any[]) {
        return 'missing: ' + args[args.length - 1].name;
      },
      helperMissing(...args: any[]) {
        return 'helper missing: ' + args[args.length - 1].name;
      },
      helper(...args: any[]) {
        return 'ran: ' + args[args.length - 1].name;
      },
    };

    it('should include in ambiguous mustache calls', () => {
      expectTemplate('{{helper}}').withHelpers(helpers).toCompileTo('ran: helper');
    });

    it('should include in helper mustache calls', () => {
      expectTemplate('{{helper 1}}').withHelpers(helpers).toCompileTo('ran: helper');
    });

    it('should include in ambiguous block calls', () => {
      expectTemplate('{{#helper}}{{/helper}}').withHelpers(helpers).toCompileTo('ran: helper');
    });

    it('should include in helper block calls', () => {
      expectTemplate('{{#helper 1}}{{/helper}}').withHelpers(helpers).toCompileTo('ran: helper');
    });

    it('should include in known helper calls', () => {
      expectTemplate('{{helper}}')
        .withCompileOptions({
          knownHelpers: { helper: true },
          knownHelpersOnly: true,
        })
        .withHelpers(helpers)
        .toCompileTo('ran: helper');
    });
  });

  describe('name conflicts', () => {
    it('helpers take precedence over same-named context properties', () => {
      expectTemplate('{{goodbye}} {{cruel world}}')
        .withHelper('goodbye', function (this: any) {
          return this.goodbye.toUpperCase();
        })
        .withHelper('cruel', function (world) {
          return 'cruel ' + world.toUpperCase();
        })
        .withInput({
          goodbye: 'goodbye',
          world: 'world',
        })
        .toCompileTo('GOODBYE cruel WORLD');
    });

    it('Scoped names take precedence over helpers', () => {
      expectTemplate('{{this.goodbye}} {{cruel world}} {{cruel this.goodbye}}')
        .withHelper('goodbye', function (this: any) {
          return this.goodbye.toUpperCase();
        })
        .withHelper('cruel', function (world) {
          return 'cruel ' + world.toUpperCase();
        })
        .withInput({
          goodbye: 'goodbye',
          world: 'world',
        })
        .toCompileTo('goodbye cruel WORLD cruel GOODBYE');
    });
  });

  describe('built-in helpers malformed arguments ', () => {
    it('if helper - too few arguments', () => {
      expectTemplate('{{#if}}{{/if}}').toThrow(/#if requires exactly one argument/);
    });

    it('if helper - too many arguments, string', () => {
      expectTemplate('{{#if test "string"}}{{/if}}').toThrow(/#if requires exactly one argument/);
    });

    it('if helper - too many arguments, undefined', () => {
      expectTemplate('{{#if test undefined}}{{/if}}').toThrow(/#if requires exactly one argument/);
    });

    it('if helper - too many arguments, null', () => {
      expectTemplate('{{#if test null}}{{/if}}').toThrow(/#if requires exactly one argument/);
    });

    it('unless helper - too few arguments', () => {
      expectTemplate('{{#unless}}{{/unless}}').toThrow(/#unless requires exactly one argument/);
    });

    it('unless helper - too many arguments', () => {
      expectTemplate('{{#unless test null}}{{/unless}}').toThrow(
        /#unless requires exactly one argument/
      );
    });

    it('with helper - too few arguments', () => {
      expectTemplate('{{#with}}{{/with}}').toThrow(/#with requires exactly one argument/);
    });

    it('with helper - too many arguments', () => {
      expectTemplate('{{#with test "string"}}{{/with}}').toThrow(
        /#with requires exactly one argument/
      );
    });
  });

  describe('the lookupProperty-option', () => {
    it('should be passed to custom helpers', () => {
      expectTemplate('{{testHelper}}')
        .withHelper('testHelper', function testHelper(this: any, options) {
          return options.lookupProperty(this, 'testProperty');
        })
        .withInput({ testProperty: 'abc' })
        .toCompileTo('abc');
    });
  });
});

function deleteAllKeys(obj: { [key: string]: any }) {
  for (const key of Object.keys(obj)) {
    delete obj[key];
  }
}
