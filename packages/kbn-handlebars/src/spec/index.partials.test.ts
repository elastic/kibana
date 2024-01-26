/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars from '../..';
import { expectTemplate, forEachCompileFunctionName } from '../__jest__/test_bench';

describe('partials', () => {
  it('basic partials', () => {
    const string = 'Dudes: {{#dudes}}{{> dude}}{{/dudes}}';
    const partial = '{{name}} ({{url}}) ';
    const hash = {
      dudes: [
        { name: 'Yehuda', url: 'http://yehuda' },
        { name: 'Alan', url: 'http://alan' },
      ],
    };

    expectTemplate(string)
      .withInput(hash)
      .withPartials({ dude: partial })
      .toCompileTo('Dudes: Yehuda (http://yehuda) Alan (http://alan) ');

    expectTemplate(string)
      .withInput(hash)
      .withPartials({ dude: partial })
      .withRuntimeOptions({ data: false })
      .withCompileOptions({ data: false })
      .toCompileTo('Dudes: Yehuda (http://yehuda) Alan (http://alan) ');
  });

  it('dynamic partials', () => {
    const string = 'Dudes: {{#dudes}}{{> (partial)}}{{/dudes}}';
    const partial = '{{name}} ({{url}}) ';
    const hash = {
      dudes: [
        { name: 'Yehuda', url: 'http://yehuda' },
        { name: 'Alan', url: 'http://alan' },
      ],
    };
    const helpers = {
      partial: () => 'dude',
    };

    expectTemplate(string)
      .withInput(hash)
      .withHelpers(helpers)
      .withPartials({ dude: partial })
      .toCompileTo('Dudes: Yehuda (http://yehuda) Alan (http://alan) ');

    expectTemplate(string)
      .withInput(hash)
      .withHelpers(helpers)
      .withPartials({ dude: partial })
      .withRuntimeOptions({ data: false })
      .withCompileOptions({ data: false })
      .toCompileTo('Dudes: Yehuda (http://yehuda) Alan (http://alan) ');
  });

  it('failing dynamic partials', () => {
    expectTemplate('Dudes: {{#dudes}}{{> (partial)}}{{/dudes}}')
      .withInput({
        dudes: [
          { name: 'Yehuda', url: 'http://yehuda' },
          { name: 'Alan', url: 'http://alan' },
        ],
      })
      .withHelper('partial', () => 'missing')
      .withPartial('dude', '{{name}} ({{url}}) ')
      .toThrow('The partial missing could not be found'); // TODO: Is there a way we can test that the error is of type `Handlebars.Exception`?
  });

  it('partials with context', () => {
    expectTemplate('Dudes: {{>dude dudes}}')
      .withInput({
        dudes: [
          { name: 'Yehuda', url: 'http://yehuda' },
          { name: 'Alan', url: 'http://alan' },
        ],
      })
      .withPartial('dude', '{{#this}}{{name}} ({{url}}) {{/this}}')
      .toCompileTo('Dudes: Yehuda (http://yehuda) Alan (http://alan) ');
  });

  it('partials with no context', () => {
    const partial = '{{name}} ({{url}}) ';
    const hash = {
      dudes: [
        { name: 'Yehuda', url: 'http://yehuda' },
        { name: 'Alan', url: 'http://alan' },
      ],
    };

    expectTemplate('Dudes: {{#dudes}}{{>dude}}{{/dudes}}')
      .withInput(hash)
      .withPartial('dude', partial)
      .withCompileOptions({ explicitPartialContext: true })
      .toCompileTo('Dudes:  ()  () ');

    expectTemplate('Dudes: {{#dudes}}{{>dude name="foo"}}{{/dudes}}')
      .withInput(hash)
      .withPartial('dude', partial)
      .withCompileOptions({ explicitPartialContext: true })
      .toCompileTo('Dudes: foo () foo () ');
  });

  it('partials with string context', () => {
    expectTemplate('Dudes: {{>dude "dudes"}}')
      .withPartial('dude', '{{.}}')
      .toCompileTo('Dudes: dudes');
  });

  it('partials with undefined context', () => {
    expectTemplate('Dudes: {{>dude dudes}}')
      .withPartial('dude', '{{foo}} Empty')
      .toCompileTo('Dudes:  Empty');
  });

  it('partials with duplicate parameters', () => {
    expectTemplate('Dudes: {{>dude dudes foo bar=baz}}').toThrow(
      'Unsupported number of partial arguments: 2 - 1:7'
    );
  });

  it('partials with parameters', () => {
    expectTemplate('Dudes: {{#dudes}}{{> dude others=..}}{{/dudes}}')
      .withInput({
        foo: 'bar',
        dudes: [
          { name: 'Yehuda', url: 'http://yehuda' },
          { name: 'Alan', url: 'http://alan' },
        ],
      })
      .withPartial('dude', '{{others.foo}}{{name}} ({{url}}) ')
      .toCompileTo('Dudes: barYehuda (http://yehuda) barAlan (http://alan) ');
  });

  it('partial in a partial', () => {
    expectTemplate('Dudes: {{#dudes}}{{>dude}}{{/dudes}}')
      .withInput({
        dudes: [
          { name: 'Yehuda', url: 'http://yehuda' },
          { name: 'Alan', url: 'http://alan' },
        ],
      })
      .withPartials({
        dude: '{{name}} {{> url}} ',
        url: '<a href="{{url}}">{{url}}</a>',
      })
      .toCompileTo(
        'Dudes: Yehuda <a href="http://yehuda">http://yehuda</a> Alan <a href="http://alan">http://alan</a> '
      );
  });

  it('rendering undefined partial throws an exception', () => {
    expectTemplate('{{> whatever}}').toThrow('The partial whatever could not be found');
  });

  it('registering undefined partial throws an exception', () => {
    global.kbnHandlebarsEnv = Handlebars.create();

    expect(() => {
      kbnHandlebarsEnv!.registerPartial('undefined_test', undefined as any);
    }).toThrow('Attempting to register a partial called "undefined_test" as undefined');

    global.kbnHandlebarsEnv = null;
  });

  it('rendering template partial in vm mode throws an exception', () => {
    expectTemplate('{{> whatever}}').toThrow('The partial whatever could not be found');
  });

  it('rendering function partial in vm mode', () => {
    function partial(context: any) {
      return context.name + ' (' + context.url + ') ';
    }
    expectTemplate('Dudes: {{#dudes}}{{> dude}}{{/dudes}}')
      .withInput({
        dudes: [
          { name: 'Yehuda', url: 'http://yehuda' },
          { name: 'Alan', url: 'http://alan' },
        ],
      })
      .withPartial('dude', partial)
      .toCompileTo('Dudes: Yehuda (http://yehuda) Alan (http://alan) ');
  });

  it('GH-14: a partial preceding a selector', () => {
    expectTemplate('Dudes: {{>dude}} {{anotherDude}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('dude', '{{name}}')
      .toCompileTo('Dudes: Jeepers Creepers');
  });

  it('Partials with slash paths', () => {
    expectTemplate('Dudes: {{> shared/dude}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('shared/dude', '{{name}}')
      .toCompileTo('Dudes: Jeepers');
  });

  it('Partials with slash and point paths', () => {
    expectTemplate('Dudes: {{> shared/dude.thing}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('shared/dude.thing', '{{name}}')
      .toCompileTo('Dudes: Jeepers');
  });

  it('Global Partials', () => {
    global.kbnHandlebarsEnv = Handlebars.create();

    kbnHandlebarsEnv!.registerPartial('globalTest', '{{anotherDude}}');

    expectTemplate('Dudes: {{> shared/dude}} {{> globalTest}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('shared/dude', '{{name}}')
      .toCompileTo('Dudes: Jeepers Creepers');

    kbnHandlebarsEnv!.unregisterPartial('globalTest');
    expect(kbnHandlebarsEnv!.partials.globalTest).toBeUndefined();

    global.kbnHandlebarsEnv = null;
  });

  it('Multiple partial registration', () => {
    global.kbnHandlebarsEnv = Handlebars.create();

    kbnHandlebarsEnv!.registerPartial({
      'shared/dude': '{{name}}',
      globalTest: '{{anotherDude}}',
    });

    expectTemplate('Dudes: {{> shared/dude}} {{> globalTest}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('notused', 'notused') // trick the test bench into running with partials enabled
      .toCompileTo('Dudes: Jeepers Creepers');

    global.kbnHandlebarsEnv = null;
  });

  it('Partials with integer path', () => {
    expectTemplate('Dudes: {{> 404}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial(404, '{{name}}')
      .toCompileTo('Dudes: Jeepers');
  });

  it('Partials with complex path', () => {
    expectTemplate('Dudes: {{> 404/asdf?.bar}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('404/asdf?.bar', '{{name}}')
      .toCompileTo('Dudes: Jeepers');
  });

  it('Partials with escaped', () => {
    expectTemplate('Dudes: {{> [+404/asdf?.bar]}}')
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('+404/asdf?.bar', '{{name}}')
      .toCompileTo('Dudes: Jeepers');
  });

  it('Partials with string', () => {
    expectTemplate("Dudes: {{> '+404/asdf?.bar'}}")
      .withInput({ name: 'Jeepers', anotherDude: 'Creepers' })
      .withPartial('+404/asdf?.bar', '{{name}}')
      .toCompileTo('Dudes: Jeepers');
  });

  it('should handle empty partial', () => {
    expectTemplate('Dudes: {{#dudes}}{{> dude}}{{/dudes}}')
      .withInput({
        dudes: [
          { name: 'Yehuda', url: 'http://yehuda' },
          { name: 'Alan', url: 'http://alan' },
        ],
      })
      .withPartial('dude', '')
      .toCompileTo('Dudes: ');
  });

  // Skipping test as this only makes sense when there's no `compile` function (i.e. runtime-only mode).
  // We do not support that mode with `@kbn/handlebars`, so there's no need to test it
  it.skip('throw on missing partial', () => {
    const handlebars = Handlebars.create();
    (handlebars.compile as any) = undefined;
    const template = handlebars.precompile('{{> dude}}');
    const render = handlebars.template(eval('(' + template + ')')); // eslint-disable-line no-eval
    expect(() => {
      render(
        {},
        {
          partials: {
            dude: 'fail',
          },
        }
      );
    }).toThrow(/The partial dude could not be compiled/);
  });

  describe('partial blocks', () => {
    it('should render partial block as default', () => {
      expectTemplate('{{#> dude}}success{{/dude}}').toCompileTo('success');
    });

    it('should execute default block with proper context', () => {
      expectTemplate('{{#> dude context}}{{value}}{{/dude}}')
        .withInput({ context: { value: 'success' } })
        .toCompileTo('success');
    });

    it('should propagate block parameters to default block', () => {
      expectTemplate('{{#with context as |me|}}{{#> dude}}{{me.value}}{{/dude}}{{/with}}')
        .withInput({ context: { value: 'success' } })
        .toCompileTo('success');
    });

    it('should not use partial block if partial exists', () => {
      expectTemplate('{{#> dude}}fail{{/dude}}')
        .withPartials({ dude: 'success' })
        .toCompileTo('success');
    });

    it('should render block from partial', () => {
      expectTemplate('{{#> dude}}success{{/dude}}')
        .withPartials({ dude: '{{> @partial-block }}' })
        .toCompileTo('success');
    });

    it('should be able to render the partial-block twice', () => {
      expectTemplate('{{#> dude}}success{{/dude}}')
        .withPartials({ dude: '{{> @partial-block }} {{> @partial-block }}' })
        .toCompileTo('success success');
    });

    it('should render block from partial with context', () => {
      expectTemplate('{{#> dude}}{{value}}{{/dude}}')
        .withInput({ context: { value: 'success' } })
        .withPartials({
          dude: '{{#with context}}{{> @partial-block }}{{/with}}',
        })
        .toCompileTo('success');
    });

    it('should be able to access the @data frame from a partial-block', () => {
      expectTemplate('{{#> dude}}in-block: {{@root/value}}{{/dude}}')
        .withInput({ value: 'success' })
        .withPartials({
          dude: '<code>before-block: {{@root/value}} {{>   @partial-block }}</code>',
        })
        .toCompileTo('<code>before-block: success in-block: success</code>');
    });

    it('should allow the #each-helper to be used along with partial-blocks', () => {
      expectTemplate('<template>{{#> list value}}value = {{.}}{{/list}}</template>')
        .withInput({
          value: ['a', 'b', 'c'],
        })
        .withPartials({
          list: '<list>{{#each .}}<item>{{> @partial-block}}</item>{{/each}}</list>',
        })
        .toCompileTo(
          '<template><list><item>value = a</item><item>value = b</item><item>value = c</item></list></template>'
        );
    });

    it('should render block from partial with context (twice)', () => {
      expectTemplate('{{#> dude}}{{value}}{{/dude}}')
        .withInput({ context: { value: 'success' } })
        .withPartials({
          dude: '{{#with context}}{{> @partial-block }} {{> @partial-block }}{{/with}}',
        })
        .toCompileTo('success success');
    });

    it('should render block from partial with context [2]', () => {
      expectTemplate('{{#> dude}}{{../context/value}}{{/dude}}')
        .withInput({ context: { value: 'success' } })
        .withPartials({
          dude: '{{#with context}}{{> @partial-block }}{{/with}}',
        })
        .toCompileTo('success');
    });

    it('should render block from partial with block params', () => {
      expectTemplate('{{#with context as |me|}}{{#> dude}}{{me.value}}{{/dude}}{{/with}}')
        .withInput({ context: { value: 'success' } })
        .withPartials({ dude: '{{> @partial-block }}' })
        .toCompileTo('success');
    });

    it('should render nested partial blocks', () => {
      expectTemplate('<template>{{#> outer}}{{value}}{{/outer}}</template>')
        .withInput({ value: 'success' })
        .withPartials({
          outer:
            '<outer>{{#> nested}}<outer-block>{{> @partial-block}}</outer-block>{{/nested}}</outer>',
          nested: '<nested>{{> @partial-block}}</nested>',
        })
        .toCompileTo(
          '<template><outer><nested><outer-block>success</outer-block></nested></outer></template>'
        );
    });

    it('should render nested partial blocks at different nesting levels', () => {
      expectTemplate('<template>{{#> outer}}{{value}}{{/outer}}</template>')
        .withInput({ value: 'success' })
        .withPartials({
          outer:
            '<outer>{{#> nested}}<outer-block>{{> @partial-block}}</outer-block>{{/nested}}{{> @partial-block}}</outer>',
          nested: '<nested>{{> @partial-block}}</nested>',
        })
        .toCompileTo(
          '<template><outer><nested><outer-block>success</outer-block></nested>success</outer></template>'
        );
    });

    it('should render nested partial blocks at different nesting levels (twice)', () => {
      expectTemplate('<template>{{#> outer}}{{value}}{{/outer}}</template>')
        .withInput({ value: 'success' })
        .withPartials({
          outer:
            '<outer>{{#> nested}}<outer-block>{{> @partial-block}} {{> @partial-block}}</outer-block>{{/nested}}{{> @partial-block}}+{{> @partial-block}}</outer>',
          nested: '<nested>{{> @partial-block}}</nested>',
        })
        .toCompileTo(
          '<template><outer><nested><outer-block>success success</outer-block></nested>success+success</outer></template>'
        );
    });

    it('should render nested partial blocks (twice at each level)', () => {
      expectTemplate('<template>{{#> outer}}{{value}}{{/outer}}</template>')
        .withInput({ value: 'success' })
        .withPartials({
          outer:
            '<outer>{{#> nested}}<outer-block>{{> @partial-block}} {{> @partial-block}}</outer-block>{{/nested}}</outer>',
          nested: '<nested>{{> @partial-block}}{{> @partial-block}}</nested>',
        })
        .toCompileTo(
          '<template><outer>' +
            '<nested><outer-block>success success</outer-block><outer-block>success success</outer-block></nested>' +
            '</outer></template>'
        );
    });
  });

  describe('inline partials', () => {
    it('should define inline partials for template', () => {
      expectTemplate('{{#*inline "myPartial"}}success{{/inline}}{{> myPartial}}').toCompileTo(
        'success'
      );
    });

    it('should overwrite multiple partials in the same template', () => {
      expectTemplate(
        '{{#*inline "myPartial"}}fail{{/inline}}{{#*inline "myPartial"}}success{{/inline}}{{> myPartial}}'
      ).toCompileTo('success');
    });

    it('should define inline partials for block', () => {
      expectTemplate(
        '{{#with .}}{{#*inline "myPartial"}}success{{/inline}}{{> myPartial}}{{/with}}'
      ).toCompileTo('success');

      expectTemplate(
        '{{#with .}}{{#*inline "myPartial"}}success{{/inline}}{{/with}}{{> myPartial}}'
      ).toThrow(/myPartial could not/);
    });

    it('should override global partials', () => {
      expectTemplate('{{#*inline "myPartial"}}success{{/inline}}{{> myPartial}}')
        .withPartials({
          myPartial: () => 'fail',
        })
        .toCompileTo('success');
    });

    it('should override template partials', () => {
      expectTemplate(
        '{{#*inline "myPartial"}}fail{{/inline}}{{#with .}}{{#*inline "myPartial"}}success{{/inline}}{{> myPartial}}{{/with}}'
      ).toCompileTo('success');
    });

    it('should override partials down the entire stack', () => {
      expectTemplate(
        '{{#with .}}{{#*inline "myPartial"}}success{{/inline}}{{#with .}}{{#with .}}{{> myPartial}}{{/with}}{{/with}}{{/with}}'
      ).toCompileTo('success');
    });

    it('should define inline partials for partial call', () => {
      expectTemplate('{{#*inline "myPartial"}}success{{/inline}}{{> dude}}')
        .withPartials({ dude: '{{> myPartial }}' })
        .toCompileTo('success');
    });

    it('should define inline partials in partial block call', () => {
      expectTemplate('{{#> dude}}{{#*inline "myPartial"}}success{{/inline}}{{/dude}}')
        .withPartials({ dude: '{{> myPartial }}' })
        .toCompileTo('success');
    });

    it('should render nested inline partials', () => {
      expectTemplate(
        '{{#*inline "outer"}}{{#>inner}}<outer-block>{{>@partial-block}}</outer-block>{{/inner}}{{/inline}}' +
          '{{#*inline "inner"}}<inner>{{>@partial-block}}</inner>{{/inline}}' +
          '{{#>outer}}{{value}}{{/outer}}'
      )
        .withInput({ value: 'success' })
        .toCompileTo('<inner><outer-block>success</outer-block></inner>');
    });

    it('should render nested inline partials with partial-blocks on different nesting levels', () => {
      expectTemplate(
        '{{#*inline "outer"}}{{#>inner}}<outer-block>{{>@partial-block}}</outer-block>{{/inner}}{{>@partial-block}}{{/inline}}' +
          '{{#*inline "inner"}}<inner>{{>@partial-block}}</inner>{{/inline}}' +
          '{{#>outer}}{{value}}{{/outer}}'
      )
        .withInput({ value: 'success' })
        .toCompileTo('<inner><outer-block>success</outer-block></inner>success');
    });

    it('should render nested inline partials (twice at each level)', () => {
      expectTemplate(
        '{{#*inline "outer"}}{{#>inner}}<outer-block>{{>@partial-block}} {{>@partial-block}}</outer-block>{{/inner}}{{/inline}}' +
          '{{#*inline "inner"}}<inner>{{>@partial-block}}{{>@partial-block}}</inner>{{/inline}}' +
          '{{#>outer}}{{value}}{{/outer}}'
      )
        .withInput({ value: 'success' })
        .toCompileTo(
          '<inner><outer-block>success success</outer-block><outer-block>success success</outer-block></inner>'
        );
    });
  });

  forEachCompileFunctionName((compileName) => {
    it(`should pass compiler flags for ${compileName} function`, () => {
      const env = Handlebars.create();
      env.registerPartial('partial', '{{foo}}');
      const compile = env[compileName].bind(env);
      const template = compile('{{foo}} {{> partial}}', { noEscape: true });
      expect(template({ foo: '<' })).toEqual('< <');
    });
  });

  describe('standalone partials', () => {
    it('indented partials', () => {
      expectTemplate('Dudes:\n{{#dudes}}\n  {{>dude}}\n{{/dudes}}')
        .withInput({
          dudes: [
            { name: 'Yehuda', url: 'http://yehuda' },
            { name: 'Alan', url: 'http://alan' },
          ],
        })
        .withPartial('dude', '{{name}}\n')
        .toCompileTo('Dudes:\n  Yehuda\n  Alan\n');
    });

    it('nested indented partials', () => {
      expectTemplate('Dudes:\n{{#dudes}}\n  {{>dude}}\n{{/dudes}}')
        .withInput({
          dudes: [
            { name: 'Yehuda', url: 'http://yehuda' },
            { name: 'Alan', url: 'http://alan' },
          ],
        })
        .withPartials({
          dude: '{{name}}\n {{> url}}',
          url: '{{url}}!\n',
        })
        .toCompileTo('Dudes:\n  Yehuda\n   http://yehuda!\n  Alan\n   http://alan!\n');
    });

    it('prevent nested indented partials', () => {
      expectTemplate('Dudes:\n{{#dudes}}\n  {{>dude}}\n{{/dudes}}')
        .withInput({
          dudes: [
            { name: 'Yehuda', url: 'http://yehuda' },
            { name: 'Alan', url: 'http://alan' },
          ],
        })
        .withPartials({
          dude: '{{name}}\n {{> url}}',
          url: '{{url}}!\n',
        })
        .withCompileOptions({ preventIndent: true })
        .toCompileTo('Dudes:\n  Yehuda\n http://yehuda!\n  Alan\n http://alan!\n');
    });
  });
});
