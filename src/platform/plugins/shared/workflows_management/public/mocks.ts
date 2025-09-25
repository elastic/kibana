/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreLifecycleMock } from '@kbn/core-lifecycle-browser-mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { serverlessMock } from '@kbn/serverless/public/mocks';
import { Storage } from '@kbn/kibana-utils-plugin/public';

export const createStartServicesMock = () => ({
  ...coreLifecycleMock.createCoreStart(),
  navigation: navigationPluginMock.createStartContract(),
  serverless: serverlessMock.createStart(),
  storage: new Storage(localStorage),
});
