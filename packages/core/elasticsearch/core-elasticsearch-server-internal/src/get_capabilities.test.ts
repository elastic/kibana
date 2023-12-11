/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getElasticsearchCapabilities } from './get_capabilities';
import type { ClusterInfo } from './get_cluster_info';

describe('getElasticsearchCapabilities', () => {
  const getClusterInfo = (parts: Partial<ClusterInfo>): ClusterInfo => ({
    cluster_name: 'cluster_name',
    cluster_uuid: 'uuid',
    cluster_version: '13.42.9000',
    cluster_build_flavor: 'default',
    ...parts,
  });

  describe('capabilities.serverless', () => {
    it('is `true` when `build_flavor` is `serverless`', () => {
      expect(
        getElasticsearchCapabilities({
          clusterInfo: getClusterInfo({ cluster_build_flavor: 'serverless' }),
        })
      ).toEqual(
        expect.objectContaining({
          serverless: true,
        })
      );
    });

    it('is `false` when `build_flavor` is `default`', () => {
      expect(
        getElasticsearchCapabilities({
          clusterInfo: getClusterInfo({ cluster_build_flavor: 'default' }),
        })
      ).toEqual(
        expect.objectContaining({
          serverless: false,
        })
      );
    });

    it('is `false` when `build_flavor` is a random string', () => {
      expect(
        getElasticsearchCapabilities({
          clusterInfo: getClusterInfo({ cluster_build_flavor: 'some totally random string' }),
        })
      ).toEqual(
        expect.objectContaining({
          serverless: false,
        })
      );
    });
  });
});
