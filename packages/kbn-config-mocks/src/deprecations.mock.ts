/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinks } from '@kbn/doc-links';
import type { ConfigDeprecationContext } from '@kbn/config';

export type ConfigDeprecationContextMock = ConfigDeprecationContext;

const createMockedContext = (): ConfigDeprecationContext => {
  return {
    branch: 'master',
    version: '8.0.0',
    docLinks: {} as DocLinks,
  };
};

export const configDeprecationsMock = {
  createContext: createMockedContext,
};
