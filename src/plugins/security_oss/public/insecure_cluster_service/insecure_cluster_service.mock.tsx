/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  InsecureClusterServiceSetup,
  InsecureClusterServiceStart,
} from './insecure_cluster_service';

export const mockInsecureClusterService = {
  createSetup: () => {
    return {
      setAlertTitle: jest.fn(),
      setAlertText: jest.fn(),
    } as InsecureClusterServiceSetup;
  },
  createStart: () => {
    return {
      hideAlert: jest.fn(),
    } as InsecureClusterServiceStart;
  },
};
