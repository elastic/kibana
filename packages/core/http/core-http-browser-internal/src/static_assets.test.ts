/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StaticAssets } from './static_assets';

describe('StaticAssets', () => {
  describe('#getPluginAssetHref()', () => {
    it('returns the expected value when the base is a path', () => {
      const staticAssets = new StaticAssets({ assetsHrefBase: '/base-path' });
      expect(staticAssets.getPluginAssetHref('foo', 'path/to/img.gif')).toEqual(
        '/base-path/plugins/foo/assets/path/to/img.gif'
      );
    });

    it('returns the expected value when the base is a full url', () => {
      const staticAssets = new StaticAssets({ assetsHrefBase: 'http://cdn/cdn-base-path' });
      expect(staticAssets.getPluginAssetHref('bar', 'path/to/img.gif')).toEqual(
        'http://cdn/cdn-base-path/plugins/bar/assets/path/to/img.gif'
      );
    });

    it('removes leading slash from the', () => {
      const staticAssets = new StaticAssets({ assetsHrefBase: '/base-path' });
      expect(staticAssets.getPluginAssetHref('dolly', '/path/for/something.svg')).toEqual(
        '/base-path/plugins/dolly/assets/path/for/something.svg'
      );
    });
  });
});
