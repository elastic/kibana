/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { InsecureClusterServiceStart } from './insecure_cluster_service';
import { mockInsecureClusterService } from './insecure_cluster_service/insecure_cluster_service.mock';
import { SecurityOssPluginSetup, SecurityOssPluginStart } from './plugin';

export const mockSecurityOssPlugin = {
  createSetup: () => {
    return {
      insecureCluster: mockInsecureClusterService.createSetup(),
    } as DeeplyMockedKeys<SecurityOssPluginSetup>;
  },
  createStart: () => {
    return {
      insecureCluster: mockInsecureClusterService.createStart() as jest.Mocked<InsecureClusterServiceStart>,
      anonymousAccess: {
        getAccessURLParameters: jest.fn().mockResolvedValue(null),
        getCapabilities: jest.fn().mockResolvedValue({}),
      },
    } as DeeplyMockedKeys<SecurityOssPluginStart>;
  },
};
