/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('initializer context', () => {
    it('passes node roles to server PluginInitializerContext', async () => {
      await supertest.get('/core_plugin_initializer_context/node/roles').expect(200, {
        backgroundTasks: false,
        migrator: false,
        ui: true,
      });
    });
  });
}
