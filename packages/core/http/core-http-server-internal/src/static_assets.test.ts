/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StaticAssets } from './static_assets';
import { BasePath } from './base_path_service';
import { CdnConfig } from './cdn';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

describe('StaticAssets', () => {
  let basePath: BasePath;
  let cdnConfig: CdnConfig;
  let staticAssets: StaticAssets;
  beforeEach(() => {
    basePath = new BasePath('/test');
    cdnConfig = CdnConfig.from();
    staticAssets = new StaticAssets(basePath, cdnConfig);
  });
  it('provides fallsback to server base path', () => {
    expect(staticAssets.getHrefBase()).toEqual('/test');
  });

  it('can be scoped with Kibana request', () => {
    const req = mockRouter.createKibanaRequest();
    basePath.set(req, '/my-space');
    expect(staticAssets.getHrefBase(req)).toEqual('/test/my-space');
  });

  it('provides the correct HREF given a CDN is configured', () => {
    cdnConfig = CdnConfig.from({ url: 'https://cdn.example.com/test' });
    staticAssets = new StaticAssets(basePath, cdnConfig);
    expect(staticAssets.getHrefBase()).toEqual('https://cdn.example.com/test');
  });
});
