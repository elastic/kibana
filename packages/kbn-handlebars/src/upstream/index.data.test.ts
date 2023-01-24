/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars from '../..';
import { expectTemplate } from '../__jest__/test_bench';

describe('data', () => {
  it('passing in data to a compiled function that expects data - works with helpers', () => {
    expectTemplate('{{hello}}')
      .withCompileOptions({ data: true })
      .withHelper('hello', function (this: any, options) {
        return options.data.adjective + ' ' + this.noun;
      })
      .withRuntimeOptions({ data: { adjective: 'happy' } })
      .withInput({ noun: 'cat' })
      .toCompileTo('happy cat');
  });

  it('data can be looked up via @foo', () => {
    expectTemplate('{{@hello}}')
      .withRuntimeOptions({ data: { hello: 'hello' } })
      .toCompileTo('hello');
  });

  it('deep @foo triggers automatic top-level data', () => {
    global.kbnHandlebarsEnv = Handlebars.create();
    const helpers = Handlebars.createFrame(kbnHandlebarsEnv!.helpers);

    helpers.let = function (options: Handlebars.HelperOptions) {
      const frame = Handlebars.createFrame(options.data);

      for (const prop in options.hash) {
        if (prop in options.hash) {
          frame[prop] = options.hash[prop];
        }
      }
      return options.fn(this, { data: frame });
    };

    expectTemplate(
      '{{#let world="world"}}{{#if foo}}{{#if foo}}Hello {{@world}}{{/if}}{{/if}}{{/let}}'
    )
      .withInput({ foo: true })
      .withHelpers(helpers)
      .toCompileTo('Hello world');

    global.kbnHandlebarsEnv = null;
  });

  it('parameter data can be looked up via @foo', () => {
    expectTemplate('{{hello @world}}')
      .withRuntimeOptions({ data: { world: 'world' } })
      .withHelper('hello', function (noun) {
        return 'Hello ' + noun;
      })
      .toCompileTo('Hello world');
  });

  it('hash values can be looked up via @foo', () => {
    expectTemplate('{{hello noun=@world}}')
      .withRuntimeOptions({ data: { world: 'world' } })
      .withHelper('hello', function (options) {
        return 'Hello ' + options.hash.noun;
      })
      .toCompileTo('Hello world');
  });

  it('nested parameter data can be looked up via @foo.bar', () => {
    expectTemplate('{{hello @world.bar}}')
      .withRuntimeOptions({ data: { world: { bar: 'world' } } })
      .withHelper('hello', function (noun) {
        return 'Hello ' + noun;
      })
      .toCompileTo('Hello world');
  });

  it('nested parameter data does not fail with @world.bar', () => {
    expectTemplate('{{hello @world.bar}}')
      .withRuntimeOptions({ data: { foo: { bar: 'world' } } })
      .withHelper('hello', function (noun) {
        return 'Hello ' + noun;
      })
      .toCompileTo('Hello undefined');
  });

  it('parameter data throws when using complex scope references', () => {
    expectTemplate('{{#goodbyes}}{{text}} cruel {{@foo/../name}}! {{/goodbyes}}').toThrow(Error);
  });

  it('data can be functions', () => {
    expectTemplate('{{@hello}}')
      .withRuntimeOptions({
        data: {
          hello() {
            return 'hello';
          },
        },
      })
      .toCompileTo('hello');
  });

  it('data can be functions with params', () => {
    expectTemplate('{{@hello "hello"}}')
      .withRuntimeOptions({
        data: {
          hello(arg: any) {
            return arg;
          },
        },
      })
      .toCompileTo('hello');
  });

  it('data is inherited downstream', () => {
    expectTemplate(
      '{{#let foo=1 bar=2}}{{#let foo=bar.baz}}{{@bar}}{{@foo}}{{/let}}{{@foo}}{{/let}}'
    )
      .withInput({ bar: { baz: 'hello world' } })
      .withCompileOptions({ data: true })
      .withHelper('let', function (this: any, options) {
        const frame = Handlebars.createFrame(options.data);
        for (const prop in options.hash) {
          if (prop in options.hash) {
            frame[prop] = options.hash[prop];
          }
        }
        return options.fn(this, { data: frame });
      })
      .withRuntimeOptions({ data: {} })
      .toCompileTo('2hello world1');
  });

  it('passing in data to a compiled function that expects data - works with helpers and parameters', () => {
    expectTemplate('{{hello world}}')
      .withCompileOptions({ data: true })
      .withHelper('hello', function (this: any, noun, options) {
        return options.data.adjective + ' ' + noun + (this.exclaim ? '!' : '');
      })
      .withInput({ exclaim: true, world: 'world' })
      .withRuntimeOptions({ data: { adjective: 'happy' } })
      .toCompileTo('happy world!');
  });

  it('passing in data to a compiled function that expects data - works with block helpers', () => {
    expectTemplate('{{#hello}}{{world}}{{/hello}}')
      .withCompileOptions({
        data: true,
      })
      .withHelper('hello', function (this: any, options) {
        return options.fn(this);
      })
      .withHelper('world', function (this: any, options) {
        return options.data.adjective + ' world' + (this.exclaim ? '!' : '');
      })
      .withInput({ exclaim: true })
      .withRuntimeOptions({ data: { adjective: 'happy' } })
      .toCompileTo('happy world!');
  });

  it('passing in data to a compiled function that expects data - works with block helpers that use ..', () => {
    expectTemplate('{{#hello}}{{world ../zomg}}{{/hello}}')
      .withCompileOptions({ data: true })
      .withHelper('hello', function (options) {
        return options.fn({ exclaim: '?' });
      })
      .withHelper('world', function (this: any, thing, options) {
        return options.data.adjective + ' ' + thing + (this.exclaim || '');
      })
      .withInput({ exclaim: true, zomg: 'world' })
      .withRuntimeOptions({ data: { adjective: 'happy' } })
      .toCompileTo('happy world?');
  });

  it('passing in data to a compiled function that expects data - data is passed to with block helpers where children use ..', () => {
    expectTemplate('{{#hello}}{{world ../zomg}}{{/hello}}')
      .withCompileOptions({ data: true })
      .withHelper('hello', function (options) {
        return options.data.accessData + ' ' + options.fn({ exclaim: '?' });
      })
      .withHelper('world', function (this: any, thing, options) {
        return options.data.adjective + ' ' + thing + (this.exclaim || '');
      })
      .withInput({ exclaim: true, zomg: 'world' })
      .withRuntimeOptions({ data: { adjective: 'happy', accessData: '#win' } })
      .toCompileTo('#win happy world?');
  });

  it('you can override inherited data when invoking a helper', () => {
    expectTemplate('{{#hello}}{{world zomg}}{{/hello}}')
      .withCompileOptions({ data: true })
      .withHelper('hello', function (options) {
        return options.fn({ exclaim: '?', zomg: 'world' }, { data: { adjective: 'sad' } });
      })
      .withHelper('world', function (this: any, thing, options) {
        return options.data.adjective + ' ' + thing + (this.exclaim || '');
      })
      .withInput({ exclaim: true, zomg: 'planet' })
      .withRuntimeOptions({ data: { adjective: 'happy' } })
      .toCompileTo('sad world?');
  });

  it('you can override inherited data when invoking a helper with depth', () => {
    expectTemplate('{{#hello}}{{world ../zomg}}{{/hello}}')
      .withCompileOptions({ data: true })
      .withHelper('hello', function (options) {
        return options.fn({ exclaim: '?' }, { data: { adjective: 'sad' } });
      })
      .withHelper('world', function (this: any, thing, options) {
        return options.data.adjective + ' ' + thing + (this.exclaim || '');
      })
      .withInput({ exclaim: true, zomg: 'world' })
      .withRuntimeOptions({ data: { adjective: 'happy' } })
      .toCompileTo('sad world?');
  });

  describe('@root', () => {
    it('the root context can be looked up via @root', () => {
      expectTemplate('{{@root.foo}}')
        .withInput({ foo: 'hello' })
        .withRuntimeOptions({ data: {} })
        .toCompileTo('hello');

      expectTemplate('{{@root.foo}}').withInput({ foo: 'hello' }).toCompileTo('hello');
    });

    it('passed root values take priority', () => {
      expectTemplate('{{@root.foo}}')
        .withInput({ foo: 'should not be used' })
        .withRuntimeOptions({ data: { root: { foo: 'hello' } } })
        .toCompileTo('hello');
    });
  });

  describe('nesting', () => {
    it('the root context can be looked up via @root', () => {
      expectTemplate(
        '{{#helper}}{{#helper}}{{@./depth}} {{@../depth}} {{@../../depth}}{{/helper}}{{/helper}}'
      )
        .withInput({ foo: 'hello' })
        .withHelper('helper', function (this: any, options) {
          const frame = Handlebars.createFrame(options.data);
          frame.depth = options.data.depth + 1;
          return options.fn(this, { data: frame });
        })
        .withRuntimeOptions({
          data: {
            depth: 0,
          },
        })
        .toCompileTo('2 1 0');
    });
  });
});
