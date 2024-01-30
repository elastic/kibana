/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CdnConfig } from './cdn_config';

describe('CdnConfig', () => {
  const PKG_INFO = { packageInfo: { buildSha: 'a816c7fae954ed02b0705fb4388ad6c88def41db' } };
  const getCdnConfig = (url: string, suffixSHADigestToURLPath = false) =>
    CdnConfig.from({ url, suffixSHADigestToURLPath }, PKG_INFO);

  it.each([
    ['https://cdn.elastic.co', 'cdn.elastic.co'],
    ['https://foo.bar', 'foo.bar'],
    ['http://foo.bar', 'foo.bar'],
    ['https://cdn.elastic.co:9999', 'cdn.elastic.co:9999'],
    ['https://cdn.elastic.co:9999/with-a-path', 'cdn.elastic.co:9999'],
  ])('host as expected for %p', (url, expected) => {
    expect(getCdnConfig(url).host).toEqual(expected);
  });

  it.each([
    ['https://cdn.elastic.co', 'https://cdn.elastic.co'],
    ['https://foo.bar', 'https://foo.bar'],
    ['http://foo.bar', 'http://foo.bar'],
    ['https://cdn.elastic.co:9999', 'https://cdn.elastic.co:9999'],
    ['https://cdn.elastic.co:9999/with-a-path', 'https://cdn.elastic.co:9999/with-a-path'],
  ])('base HREF as expected for %p', (url, expected) => {
    expect(getCdnConfig(url).baseHref).toEqual(expected);
  });

  it.each([['foo'], ['#!']])('throws for invalid URLs (%p)', (url) => {
    expect(() => getCdnConfig(url)).toThrow(/Invalid URL/);
  });

  it('handles empty urls', () => {
    expect(getCdnConfig('').baseHref).toBeUndefined();
    expect(getCdnConfig('').host).toBeUndefined();
  });

  it('generates the expected CSP additions', () => {
    const cdnConfig = getCdnConfig('https://foo.bar:9999');
    expect(cdnConfig.getCspConfig()).toEqual({
      connect_src: ['foo.bar:9999'],
      font_src: ['foo.bar:9999'],
      img_src: ['foo.bar:9999'],
      script_src: ['foo.bar:9999'],
      style_src: ['foo.bar:9999'],
      worker_src: ['foo.bar:9999'],
    });
  });

  it('generates the expected CSP additions when no URL is provided', () => {
    const cdnConfig = getCdnConfig('');
    expect(cdnConfig.getCspConfig()).toEqual({});
  });

  it('suffixes the SHA digest to the path when enabled', () => {
    expect(getCdnConfig('https://foo.bar:9999', true).baseHref).toEqual(
      'https://foo.bar:9999/a816c7fae954'
    );
    expect(getCdnConfig('https://foo.bar:9999/cool-path', true).baseHref).toEqual(
      'https://foo.bar:9999/cool-path/a816c7fae954'
    );
    expect(
      CdnConfig.from(
        { url: 'https://foo.bar:9999/cool-path', suffixSHADigestToURLPath: true },
        { packageInfo: { buildSha: '123' } }
      ).baseHref
    ).toEqual('https://foo.bar:9999/cool-path/123');
  });
});
