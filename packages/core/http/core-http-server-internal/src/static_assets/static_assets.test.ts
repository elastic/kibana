/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StaticAssets, type StaticAssetsParams } from './static_assets';
import { BasePath } from '../base_path_service';
import { CdnConfig } from '../cdn_config';

describe('StaticAssets', () => {
  let basePath: BasePath;
  let cdnConfig: CdnConfig;
  let staticAssets: StaticAssets;
  let args: StaticAssetsParams;

  beforeEach(() => {
    basePath = new BasePath('/base-path');
    cdnConfig = CdnConfig.from();
    args = { basePath, cdnConfig, shaDigest: '' };
  });

  describe('#getHrefBase()', () => {
    it('provides fallback to server base path', () => {
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getHrefBase()).toEqual('/base-path');
    });

    it('provides the correct HREF given a CDN is configured', () => {
      args.cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getHrefBase()).toEqual('https://cdn.example.com/test');
    });
  });

  describe('#isUsingCdn()', () => {
    it('returns false when the CDN is not configured', () => {
      staticAssets = new StaticAssets(args);
      expect(staticAssets.isUsingCdn()).toBe(false);
    });

    it('returns true when the CDN is configured', () => {
      args.cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
      staticAssets = new StaticAssets(args);
      expect(staticAssets.isUsingCdn()).toBe(true);
    });

    it('returns false when CDN config contains "null" URL', () => {
      args.cdnConfig = CdnConfig.from({ url: null });
      staticAssets = new StaticAssets(args);
      expect(staticAssets.isUsingCdn()).toBe(false);
    });
  });

  describe('#getPluginAssetHref()', () => {
    it('returns the expected value when CDN is not configured', () => {
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getPluginAssetHref('foo', 'path/to/img.gif')).toEqual(
        '/base-path/plugins/foo/assets/path/to/img.gif'
      );
    });

    it('returns the expected value when CDN is configured', () => {
      args.cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getPluginAssetHref('bar', 'path/to/img.gif')).toEqual(
        'https://cdn.example.com/test/plugins/bar/assets/path/to/img.gif'
      );
    });

    it('removes leading and trailing slash from the assetPath', () => {
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getPluginAssetHref('dolly', '/path/for/something.svg/')).toEqual(
        '/base-path/plugins/dolly/assets/path/for/something.svg'
      );
    });
    it('removes leading and trailing slash from the assetPath when CDN is configured', () => {
      args.cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getPluginAssetHref('dolly', '/path/for/something.svg/')).toEqual(
        'https://cdn.example.com/test/plugins/dolly/assets/path/for/something.svg'
      );
    });
  });

  describe('with a SHA digest provided', () => {
    describe('cdn', () => {
      it.each([
        ['https://cdn.example.com', 'https://cdn.example.com/beef', undefined],
        ['https://cdn.example.com:1234', 'https://cdn.example.com:1234/beef', undefined],
        [
          'https://cdn.example.com:1234/roast',
          'https://cdn.example.com:1234/roast/beef',
          undefined,
        ],
        // put slashes around shaDigest
        [
          'https://cdn.example.com:1234/roast-slash',
          'https://cdn.example.com:1234/roast-slash/beef',
          '/beef/',
        ],
      ])('suffixes the digest to the CDNs path value (%s)', (url, expectedHref, shaDigest) => {
        args.shaDigest = shaDigest ?? 'beef';
        args.cdnConfig = CdnConfig.from({ url });
        staticAssets = new StaticAssets(args);
        expect(staticAssets.getHrefBase()).toEqual(expectedHref);
      });
    });

    describe('base path', () => {
      it.each([
        ['', '/beef', undefined],
        ['/', '/beef', undefined],
        ['/roast', '/roast/beef', undefined],
        ['/roast/', '/roast/beef', '/beef/'], // cheeky test adding a slashes to digest
      ])('suffixes the digest to the server base path "%s")', (url, expectedPath, shaDigest) => {
        basePath = new BasePath(url);
        args.basePath = basePath;
        args.shaDigest = shaDigest ?? 'beef';
        staticAssets = new StaticAssets(args);
        expect(staticAssets.getHrefBase()).toEqual(expectedPath);
      });
    });
  });

  describe('#getPluginServerPath()', () => {
    it('provides the path plugin assets can use for server routes', () => {
      args.shaDigest = '1234';
      staticAssets = new StaticAssets(args);
      expect(staticAssets.getPluginServerPath('myPlugin', '/fun/times')).toEqual(
        '/1234/plugins/myPlugin/assets/fun/times'
      );
    });
  });
  describe('#prependPublicUrl()', () => {
    it('with a CDN it appends as expected', () => {
      args.cdnConfig = CdnConfig.from({ url: 'http://cdn.example.com/cool?123=true' });
      staticAssets = new StaticAssets(args);
      expect(staticAssets.prependPublicUrl('beans')).toEqual(
        'http://cdn.example.com/cool/beans?123=true'
      );
    });

    it('without a CDN it appends as expected', () => {
      staticAssets = new StaticAssets(args);
      expect(staticAssets.prependPublicUrl('/cool/beans')).toEqual('/base-path/cool/beans');
    });
  });
});
