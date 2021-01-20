/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { coreMock } from '../../../core/server/mocks';
import { SecurityOssPlugin } from './plugin';

describe('SecurityOss Plugin', () => {
  describe('#setup', () => {
    it('exposes the proper contract', async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new SecurityOssPlugin(context);
      const core = coreMock.createSetup();
      const contract = plugin.setup(core);
      expect(Object.keys(contract)).toMatchInlineSnapshot(`
        Array [
          "showInsecureClusterWarning$",
          "setAnonymousAccessServiceProvider",
        ]
      `);
    });
  });
});
