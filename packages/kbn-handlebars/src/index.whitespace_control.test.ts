/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectTemplate } from './__jest__/test_bench';

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
