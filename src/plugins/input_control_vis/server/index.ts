/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { first } from 'rxjs/operators';

export const config: PluginConfigDescriptor = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: true }) }),
};

export const plugin = (initializerContext: PluginInitializerContext) => ({
  setup(core: CoreSetup) {
    // TODO this is a workaround to pass global config settings to the client
    // once kibana.autocompleteTerminateAfter and kibana.autocompleteTimeout
    // are migrated completely and owned by a plugin, this can be done completely
    // client side and the additional endpoint is not required anymore
    core.http.createRouter().get(
      {
        path: '/api/input_control_vis/settings',
        validate: false,
      },
      async (context, request, response) => {
        const legacyConfig = await initializerContext.config.legacy.globalConfig$
          .pipe(first())
          .toPromise();
        return response.ok({
          body: {
            autocompleteTimeout: legacyConfig.kibana.autocompleteTimeout.asMilliseconds(),
            autocompleteTerminateAfter: legacyConfig.kibana.autocompleteTerminateAfter.asMilliseconds(),
          },
        });
      }
    );
  },
  start() {},
});
