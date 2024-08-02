/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CdnConfig } from './cdn_config';

describe('CdnConfig', () => {
  it.each([
    ['https://cdn.elastic.co', 'cdn.elastic.co'],
    ['https://foo.bar', 'foo.bar'],
    ['http://foo.bar', 'foo.bar'],
    ['https://cdn.elastic.co:9999', 'cdn.elastic.co:9999'],
    ['https://cdn.elastic.co:9999/with-a-path', 'cdn.elastic.co:9999'],
  ])('host as expected for %p', (url, expected) => {
    expect(CdnConfig.from({ url }).host).toEqual(expected);
  });

  it.each([
    ['https://cdn.elastic.co', 'https://cdn.elastic.co'],
    ['https://foo.bar', 'https://foo.bar'],
    ['http://foo.bar', 'http://foo.bar'],
    ['https://cdn.elastic.co:9999', 'https://cdn.elastic.co:9999'],
    ['https://cdn.elastic.co:9999/with-a-path', 'https://cdn.elastic.co:9999/with-a-path'],
  ])('base HREF as expected for %p', (url, expected) => {
    expect(CdnConfig.from({ url }).baseHref).toEqual(expected);
  });

  it.each([['foo'], ['#!']])('throws for invalid URLs (%p)', (url) => {
    expect(() => CdnConfig.from({ url })).toThrow(/Invalid URL/);
  });

  it('handles empty urls', () => {
    expect(CdnConfig.from({ url: '' }).baseHref).toBeUndefined();
    expect(CdnConfig.from({ url: '' }).host).toBeUndefined();
  });

  it('generates the expected CSP additions', () => {
    const cdnConfig = CdnConfig.from({ url: 'https://foo.bar:9999' });
    expect(cdnConfig.getCspConfig()).toEqual({
      connect_src: ['https:'],
      font_src: ['foo.bar:9999'],
      img_src: ['foo.bar:9999'],
      script_src: ['foo.bar:9999'],
      style_src: ['foo.bar:9999'],
      worker_src: ['foo.bar:9999'],
    });
  });

  it('generates the expected CSP additions when no URL is provided', () => {
    const cdnConfig = CdnConfig.from({ url: '' });
    expect(cdnConfig.getCspConfig()).toEqual({});
  });

  it('accepts "null" URL', () => {
    const cdnConfig = CdnConfig.from({ url: null });
    expect(cdnConfig.baseHref).toBeUndefined();
    expect(cdnConfig.host).toBeUndefined();
    expect(cdnConfig.getCspConfig()).toEqual({});
  });
});
