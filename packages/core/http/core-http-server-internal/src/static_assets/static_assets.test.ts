/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StaticAssets } from './static_assets';
import { BasePath } from '../base_path_service';
import { CdnConfig } from '../cdn_config';

describe('StaticAssets', () => {
  let basePath: BasePath;
  let cdnConfig: CdnConfig;
  let staticAssets: StaticAssets;

  beforeEach(() => {
    basePath = new BasePath('/base-path');
  });

  describe('#getHrefBase()', () => {
    it('provides fallback to server base path', () => {
      cdnConfig = CdnConfig.from();
      staticAssets = new StaticAssets(basePath, cdnConfig, '');
      expect(staticAssets.getHrefBase()).toEqual('/base-path');
    });

    it('provides the correct HREF given a CDN is configured', () => {
      cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
      staticAssets = new StaticAssets(basePath, cdnConfig, '');
      expect(staticAssets.getHrefBase()).toEqual('https://cdn.example.com/test');
    });
  });

  describe('#getPluginAssetHref()', () => {
    it('returns the expected value when CDN config is not set', () => {
      cdnConfig = CdnConfig.from();
      staticAssets = new StaticAssets(basePath, cdnConfig, '');
      expect(staticAssets.getPluginAssetHref('foo', 'path/to/img.gif')).toEqual(
        '/base-path/plugins/foo/assets/path/to/img.gif'
      );
    });

    it('returns the expected value when CDN config is set', () => {
      cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
      staticAssets = new StaticAssets(basePath, cdnConfig, '');
      expect(staticAssets.getPluginAssetHref('bar', 'path/to/img.gif')).toEqual(
        'https://cdn.example.com/test/plugins/bar/assets/path/to/img.gif'
      );
    });

    it('removes leading slash from the assetPath', () => {
      cdnConfig = CdnConfig.from();
      staticAssets = new StaticAssets(basePath, cdnConfig, '');
      expect(staticAssets.getPluginAssetHref('dolly', '/path/for/something.svg')).toEqual(
        '/base-path/plugins/dolly/assets/path/for/something.svg'
      );
    });
  });

  describe('with a SHA digest provided', () => {
    describe('cdn', () => {
      it.each([
        ['https://cdn.example.com', 'https://cdn.example.com/beef'],
        ['https://cdn.example.com:1234', 'https://cdn.example.com:1234/beef'],
        ['https://cdn.example.com:1234/roast', 'https://cdn.example.com:1234/roast/beef'],
        [
          'https://cdn.example.com:1234/roast?thing=1',
          'https://cdn.example.com:1234/roast/beef?thing=1',
        ],
      ])('suffixes the digest to the CDNs path value (%s)', (url, expectedHref) => {
        cdnConfig = CdnConfig.from({ url });
        staticAssets = new StaticAssets(basePath, cdnConfig, 'beef');
        expect(staticAssets.getHrefBase()).toEqual(expectedHref);
      });
    });

    describe('base path', () => {
      it.each([
        ['', '/beef'],
        ['/', '/beef'],
        ['/roast', '/roast/beef'],
      ])('suffixes the digest to the server base path (%s)', (url, expectedPath) => {
        cdnConfig = CdnConfig.from();
        basePath = new BasePath(url);
        staticAssets = new StaticAssets(basePath, cdnConfig, 'beef');
        expect(staticAssets.getHrefBase()).toEqual(expectedPath);
      });
    });
  });

  describe('#getPluginServerPath()', () => {
    it('provides fallback to server base path', () => {
      cdnConfig = CdnConfig.from();
      staticAssets = new StaticAssets(basePath, cdnConfig, '1234');
      expect(staticAssets.getPluginServerPath('myPlugin', '/fun/times')).toEqual(
        '/1234/plugins/myPlugin/assets/fun/times'
      );
    });
  });
});
