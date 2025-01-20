/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';

export const createPluginInitializerContextMock = (config: unknown = {}) => {
  const mock: PluginInitializerContext = {
    opaqueId: Symbol(),
    env: {
      mode: {
        dev: true,
        name: 'development',
        prod: false,
      },
      packageInfo: {
        version: 'version',
        branch: 'branch',
        buildNum: 100,
        buildSha: 'buildSha',
        buildShaShort: 'buildShaShort',
        dist: false,
        buildDate: new Date('2023-05-15T23:12:09.000Z'),
        buildFlavor: 'traditional',
      },
    },
    logger: loggerMock.create(),
    config: {
      get: <T>() => config as T,
    },
  };

  return mock;
};
