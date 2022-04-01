/*
 * This file is forked from the handlebars project (https://github.com/handlebars-lang/handlebars.js),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import { expectTemplate } from '../__jest__/test_bench';

describe('whitespace control', () => {
  it('should strip whitespace around mustache calls', () => {
    const hash = { foo: 'bar<' };
    expectTemplate(' {{~foo~}} ').withInput(hash).toCompileTo('bar&lt;');
    expectTemplate(' {{~foo}} ').withInput(hash).toCompileTo('bar&lt; ');
    expectTemplate(' {{foo~}} ').withInput(hash).toCompileTo(' bar&lt;');
    expectTemplate(' {{~&foo~}} ').withInput(hash).toCompileTo('bar<');
    expectTemplate(' {{~{foo}~}} ').withInput(hash).toCompileTo('bar<');
    expectTemplate('1\n{{foo~}} \n\n 23\n{{bar}}4').toCompileTo('1\n23\n4');
  });

  describe('blocks', () => {
    it('should strip whitespace around simple block calls', () => {
      const hash = { foo: 'bar<' };

      expectTemplate(' {{~#if foo~}} bar {{~/if~}} ').withInput(hash).toCompileTo('bar');
      expectTemplate(' {{#if foo~}} bar {{/if~}} ').withInput(hash).toCompileTo(' bar ');
      expectTemplate(' {{~#if foo}} bar {{~/if}} ').withInput(hash).toCompileTo(' bar ');
      expectTemplate(' {{#if foo}} bar {{/if}} ').withInput(hash).toCompileTo('  bar  ');

      expectTemplate(' \n\n{{~#if foo~}} \n\nbar \n\n{{~/if~}}\n\n ')
        .withInput(hash)
        .toCompileTo('bar');

      expectTemplate(' a\n\n{{~#if foo~}} \n\nbar \n\n{{~/if~}}\n\na ')
        .withInput(hash)
        .toCompileTo(' abara ');
    });

    it('should strip whitespace around inverse block calls', () => {
      expectTemplate(' {{~^if foo~}} bar {{~/if~}} ').toCompileTo('bar');
      expectTemplate(' {{^if foo~}} bar {{/if~}} ').toCompileTo(' bar ');
      expectTemplate(' {{~^if foo}} bar {{~/if}} ').toCompileTo(' bar ');
      expectTemplate(' {{^if foo}} bar {{/if}} ').toCompileTo('  bar  ');
      expectTemplate(' \n\n{{~^if foo~}} \n\nbar \n\n{{~/if~}}\n\n ').toCompileTo('bar');
    });

    it('should strip whitespace around complex block calls', () => {
      const hash = { foo: 'bar<' };

      expectTemplate('{{#if foo~}} bar {{~^~}} baz {{~/if}}').withInput(hash).toCompileTo('bar');
      expectTemplate('{{#if foo~}} bar {{^~}} baz {{/if}}').withInput(hash).toCompileTo('bar ');
      expectTemplate('{{#if foo}} bar {{~^~}} baz {{~/if}}').withInput(hash).toCompileTo(' bar');
      expectTemplate('{{#if foo}} bar {{^~}} baz {{/if}}').withInput(hash).toCompileTo(' bar ');
      expectTemplate('{{#if foo~}} bar {{~else~}} baz {{~/if}}').withInput(hash).toCompileTo('bar');

      expectTemplate('\n\n{{~#if foo~}} \n\nbar \n\n{{~^~}} \n\nbaz \n\n{{~/if~}}\n\n')
        .withInput(hash)
        .toCompileTo('bar');

      expectTemplate('\n\n{{~#if foo~}} \n\n{{{foo}}} \n\n{{~^~}} \n\nbaz \n\n{{~/if~}}\n\n')
        .withInput(hash)
        .toCompileTo('bar<');

      expectTemplate('{{#if foo~}} bar {{~^~}} baz {{~/if}}').toCompileTo('baz');
      expectTemplate('{{#if foo}} bar {{~^~}} baz {{/if}}').toCompileTo('baz ');
      expectTemplate('{{#if foo~}} bar {{~^}} baz {{~/if}}').toCompileTo(' baz');
      expectTemplate('{{#if foo~}} bar {{~^}} baz {{/if}}').toCompileTo(' baz ');
      expectTemplate('{{#if foo~}} bar {{~else~}} baz {{~/if}}').toCompileTo('baz');
      expectTemplate('\n\n{{~#if foo~}} \n\nbar \n\n{{~^~}} \n\nbaz \n\n{{~/if~}}\n\n').toCompileTo(
        'baz'
      );
    });
  });

  it('should only strip whitespace once', () => {
    expectTemplate(' {{~foo~}} {{foo}} {{foo}} ')
      .withInput({ foo: 'bar' })
      .toCompileTo('barbar bar ');
  });
});
