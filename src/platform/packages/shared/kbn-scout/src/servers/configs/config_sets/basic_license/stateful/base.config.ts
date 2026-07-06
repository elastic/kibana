/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Mirrors FTR `functional_basic` ML suites: Elasticsearch starts with a basic license so
 * ML trial-only UI (e.g. create job cards) stays hidden.
 */
export const basicLicenseConfig: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    license: 'basic',
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.license.self_generated.type=basic',
    ],
  },
};
