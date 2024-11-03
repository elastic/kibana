/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars, { type HelperOptions } from '../..';
import { expectTemplate, forEachCompileFunctionName } from '../__jest__/test_bench';

describe('Regressions', () => {
  it('GH-94: Cannot read property of undefined', () => {
    expectTemplate('{{#books}}{{title}}{{author.name}}{{/books}}')
      .withInput({
        books: [
          {
            title: 'The origin of species',
            author: {
              name: 'Charles Darwin',
            },
          },
          {
            title: 'Lazarillo de Tormes',
          },
        ],
      })
      .toCompileTo('The origin of speciesCharles DarwinLazarillo de Tormes');
  });

  it("GH-150: Inverted sections print when they shouldn't", () => {
    const string = '{{^set}}not set{{/set}} :: {{#set}}set{{/set}}';
    expectTemplate(string).toCompileTo('not set :: ');
    expectTemplate(string).withInput({ set: undefined }).toCompileTo('not set :: ');
    expectTemplate(string).withInput({ set: false }).toCompileTo('not set :: ');
    expectTemplate(string).withInput({ set: true }).toCompileTo(' :: set');
  });

  it('GH-158: Using array index twice, breaks the template', () => {
    expectTemplate('{{arr.[0]}}, {{arr.[1]}}')
      .withInput({ arr: [1, 2] })
      .toCompileTo('1, 2');
  });

  it("bug reported by @fat where lambdas weren't being properly resolved", () => {
    const string =
      '<strong>This is a slightly more complicated {{thing}}.</strong>.\n' +
      '{{! Just ignore this business. }}\n' +
      'Check this out:\n' +
      '{{#hasThings}}\n' +
      '<ul>\n' +
      '{{#things}}\n' +
      '<li class={{className}}>{{word}}</li>\n' +
      '{{/things}}</ul>.\n' +
      '{{/hasThings}}\n' +
      '{{^hasThings}}\n' +
      '\n' +
      '<small>Nothing to check out...</small>\n' +
      '{{/hasThings}}';

    const data = {
      thing() {
        return 'blah';
      },
      things: [
        { className: 'one', word: '@fat' },
        { className: 'two', word: '@dhg' },
        { className: 'three', word: '@sayrer' },
      ],
      hasThings() {
        return true;
      },
    };

    const output =
      '<strong>This is a slightly more complicated blah.</strong>.\n' +
      'Check this out:\n' +
      '<ul>\n' +
      '<li class=one>@fat</li>\n' +
      '<li class=two>@dhg</li>\n' +
      '<li class=three>@sayrer</li>\n' +
      '</ul>.\n';

    expectTemplate(string).withInput(data).toCompileTo(output);
  });

  it('GH-408: Multiple loops fail', () => {
    expectTemplate('{{#.}}{{name}}{{/.}}{{#.}}{{name}}{{/.}}{{#.}}{{name}}{{/.}}')
      .withInput([
        { name: 'John Doe', location: { city: 'Chicago' } },
        { name: 'Jane Doe', location: { city: 'New York' } },
      ])
      .toCompileTo('John DoeJane DoeJohn DoeJane DoeJohn DoeJane Doe');
  });

  it('GS-428: Nested if else rendering', () => {
    const succeedingTemplate =
      '{{#inverse}} {{#blk}} Unexpected {{/blk}} {{else}}  {{#blk}} Expected {{/blk}} {{/inverse}}';
    const failingTemplate =
      '{{#inverse}} {{#blk}} Unexpected {{/blk}} {{else}} {{#blk}} Expected {{/blk}} {{/inverse}}';

    const helpers = {
      blk(block: HelperOptions) {
        return block.fn('');
      },
      inverse(block: HelperOptions) {
        return block.inverse('');
      },
    };

    expectTemplate(succeedingTemplate).withHelpers(helpers).toCompileTo('   Expected  ');
    expectTemplate(failingTemplate).withHelpers(helpers).toCompileTo('  Expected  ');
  });

  it('GH-458: Scoped this identifier', () => {
    expectTemplate('{{./foo}}').withInput({ foo: 'bar' }).toCompileTo('bar');
  });

  it('GH-375: Unicode line terminators', () => {
    expectTemplate('\u2028').toCompileTo('\u2028');
  });

  it('GH-534: Object prototype aliases', () => {
    /* eslint-disable no-extend-native */
    // @ts-expect-error
    Object.prototype[0xd834] = true;

    expectTemplate('{{foo}}').withInput({ foo: 'bar' }).toCompileTo('bar');

    // @ts-expect-error
    delete Object.prototype[0xd834];
    /* eslint-enable no-extend-native */
  });

  it('GH-437: Matching escaping', () => {
    expectTemplate('{{{a}}').toThrow(/Parse error on/);
    expectTemplate('{{a}}}').toThrow(/Parse error on/);
  });

  it('GH-676: Using array in escaping mustache fails', () => {
    const data = { arr: [1, 2] };
    expectTemplate('{{arr}}').withInput(data).toCompileTo(data.arr.toString());
  });

  it('Mustache man page', () => {
    expectTemplate(
      'Hello {{name}}. You have just won ${{value}}!{{#in_ca}} Well, ${{taxed_value}}, after taxes.{{/in_ca}}'
    )
      .withInput({
        name: 'Chris',
        value: 10000,
        taxed_value: 10000 - 10000 * 0.4,
        in_ca: true,
      })
      .toCompileTo('Hello Chris. You have just won $10000! Well, $6000, after taxes.');
  });

  it('GH-731: zero context rendering', () => {
    expectTemplate('{{#foo}} This is {{bar}} ~ {{/foo}}')
      .withInput({
        foo: 0,
        bar: 'OK',
      })
      .toCompileTo(' This is  ~ ');
  });

  it('GH-820: zero pathed rendering', () => {
    expectTemplate('{{foo.bar}}').withInput({ foo: 0 }).toCompileTo('');
  });

  it('GH-837: undefined values for helpers', () => {
    expectTemplate('{{str bar.baz}}')
      .withHelpers({
        str(value) {
          return value + '';
        },
      })
      .toCompileTo('undefined');
  });

  it('GH-926: Depths and de-dupe', () => {
    expectTemplate(
      '{{#if dater}}{{#each data}}{{../name}}{{/each}}{{else}}{{#each notData}}{{../name}}{{/each}}{{/if}}'
    )
      .withInput({
        name: 'foo',
        data: [1],
        notData: [1],
      })
      .toCompileTo('foo');
  });

  it('GH-1021: Each empty string key', () => {
    expectTemplate('{{#each data}}Key: {{@key}}\n{{/each}}')
      .withInput({
        data: {
          '': 'foo',
          name: 'Chris',
          value: 10000,
        },
      })
      .toCompileTo('Key: \nKey: name\nKey: value\n');
  });

  it('GH-1054: Should handle simple safe string responses', () => {
    expectTemplate('{{#wrap}}{{>partial}}{{/wrap}}')
      .withHelpers({
        wrap(options: HelperOptions) {
          return new Handlebars.SafeString(options.fn());
        },
      })
      .withPartials({
        partial: '{{#wrap}}<partial>{{/wrap}}',
      })
      .toCompileTo('<partial>');
  });

  it('GH-1065: Sparse arrays', () => {
    const array = [];
    array[1] = 'foo';
    array[3] = 'bar';
    expectTemplate('{{#each array}}{{@index}}{{.}}{{/each}}')
      .withInput({ array })
      .toCompileTo('1foo3bar');
  });

  it('GH-1093: Undefined helper context', () => {
    expectTemplate('{{#each obj}}{{{helper}}}{{.}}{{/each}}')
      .withInput({ obj: { foo: undefined, bar: 'bat' } })
      .withHelpers({
        helper(this: any) {
          // It's valid to execute a block against an undefined context, but
          // helpers can not do so, so we expect to have an empty object here;
          for (const name in this) {
            if (Object.hasOwn(this, name)) {
              return 'found';
            }
          }
          // And to make IE happy, check for the known string as length is not enumerated.
          return this === 'bat' ? 'found' : 'not';
        },
      })
      .toCompileTo('notfoundbat');
  });

  it('should support multiple levels of inline partials', () => {
    expectTemplate('{{#> layout}}{{#*inline "subcontent"}}subcontent{{/inline}}{{/layout}}')
      .withPartials({
        doctype: 'doctype{{> content}}',
        layout: '{{#> doctype}}{{#*inline "content"}}layout{{> subcontent}}{{/inline}}{{/doctype}}',
      })
      .toCompileTo('doctypelayoutsubcontent');
  });

  it('GH-1089: should support failover content in multiple levels of inline partials', () => {
    expectTemplate('{{#> layout}}{{/layout}}')
      .withPartials({
        doctype: 'doctype{{> content}}',
        layout:
          '{{#> doctype}}{{#*inline "content"}}layout{{#> subcontent}}subcontent{{/subcontent}}{{/inline}}{{/doctype}}',
      })
      .toCompileTo('doctypelayoutsubcontent');
  });

  it('GH-1099: should support greater than 3 nested levels of inline partials', () => {
    expectTemplate('{{#> layout}}Outer{{/layout}}')
      .withPartials({
        layout: '{{#> inner}}Inner{{/inner}}{{> @partial-block }}',
        inner: '',
      })
      .toCompileTo('Outer');
  });

  it('GH-1135 : Context handling within each iteration', () => {
    expectTemplate(
      '{{#each array}}\n' +
        ' 1. IF: {{#if true}}{{../name}}-{{../../name}}-{{../../../name}}{{/if}}\n' +
        ' 2. MYIF: {{#myif true}}{{../name}}={{../../name}}={{../../../name}}{{/myif}}\n' +
        '{{/each}}'
    )
      .withInput({ array: [1], name: 'John' })
      .withHelpers({
        myif(conditional, options: HelperOptions) {
          if (conditional) {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
      })
      .toCompileTo(' 1. IF: John--\n' + ' 2. MYIF: John==\n');
  });

  it('GH-1186: Support block params for existing programs', () => {
    expectTemplate(
      '{{#*inline "test"}}{{> @partial-block }}{{/inline}}' +
        '{{#>test }}{{#each listOne as |item|}}{{ item }}{{/each}}{{/test}}' +
        '{{#>test }}{{#each listTwo as |item|}}{{ item }}{{/each}}{{/test}}'
    )
      .withInput({
        listOne: ['a'],
        listTwo: ['b'],
      })
      .toCompileTo('ab');
  });

  it('GH-1319: "unless" breaks when "each" value equals "null"', () => {
    expectTemplate('{{#each list}}{{#unless ./prop}}parent={{../value}} {{/unless}}{{/each}}')
      .withInput({
        value: 'parent',
        list: [null, 'a'],
      })
      .toCompileTo('parent=parent parent=parent ');
  });

  it('GH-1341: 4.0.7 release breaks {{#if @partial-block}} usage', () => {
    expectTemplate('template {{>partial}} template')
      .withPartials({
        partialWithBlock: '{{#if @partial-block}} block {{> @partial-block}} block {{/if}}',
        partial: '{{#> partialWithBlock}} partial {{/partialWithBlock}}',
      })
      .toCompileTo('template  block  partial  block  template');
  });

  it('should allow hash with protected array names', () => {
    expectTemplate('{{helpa length="foo"}}')
      .withInput({ array: [1], name: 'John' })
      .withHelpers({
        helpa(options: HelperOptions) {
          return options.hash.length;
        },
      })
      .toCompileTo('foo');
  });

  describe('GH-1598: Performance degradation for partials since v4.3.0', () => {
    let newHandlebarsInstance: typeof Handlebars;
    let spy: jest.SpyInstance;
    beforeEach(() => {
      newHandlebarsInstance = Handlebars.create();
    });
    afterEach(() => {
      spy.mockRestore();
    });

    forEachCompileFunctionName((compileName) => {
      it(`should only compile global partials once when calling #${compileName}`, () => {
        const compile = newHandlebarsInstance[compileName].bind(newHandlebarsInstance);
        let calls;
        switch (compileName) {
          case 'compile':
            spy = jest.spyOn(newHandlebarsInstance, 'template');
            calls = 3;
            break;
          case 'compileAST':
            spy = jest.spyOn(newHandlebarsInstance, 'compileAST');
            calls = 2;
            break;
        }
        newHandlebarsInstance.registerPartial({
          dude: 'I am a partial',
        });
        const string = 'Dudes: {{> dude}} {{> dude}}';
        compile(string)(); // This should compile template + partial once
        compile(string)(); // This should only compile template
        expect(spy).toHaveBeenCalledTimes(calls);
        spy.mockRestore();
      });
    });
  });

  describe("GH-1639: TypeError: Cannot read property 'apply' of undefined\" when handlebars version > 4.6.0 (undocumented, deprecated usage)", () => {
    it('should treat undefined helpers like non-existing helpers', () => {
      expectTemplate('{{foo}}')
        .withHelper('foo', undefined as any)
        .withInput({ foo: 'bar' })
        .toCompileTo('bar');
    });
  });
});
