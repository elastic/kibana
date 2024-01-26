/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializer, Plugin } from '@kbn/core-plugins-server';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { MOCK_IDP_LOGIN_PATH, MOCK_IDP_LOGOUT_PATH, createSAMLResponse } from '@kbn/mock-idp-utils';

const createSAMLResponseSchema = schema.object({
  username: schema.string(),
  full_name: schema.maybe(schema.nullable(schema.string())),
  email: schema.maybe(schema.nullable(schema.string())),
  roles: schema.arrayOf(schema.string()),
});

export type CreateSAMLResponseParams = TypeOf<typeof createSAMLResponseSchema>;

export const plugin: PluginInitializer<void, void> = async (): Promise<Plugin> => ({
  setup(core) {
    const router = core.http.createRouter();

    core.http.resources.register(
      {
        path: MOCK_IDP_LOGIN_PATH,
        validate: false,
        options: { authRequired: false },
      },
      async (context, request, response) => {
        return response.renderAnonymousCoreApp();
      }
    );

    router.post(
      {
        path: '/mock_idp/saml_response',
        validate: {
          body: createSAMLResponseSchema,
        },
        options: { authRequired: false },
      },
      async (context, request, response) => {
        const { protocol, hostname, port } = core.http.getServerInfo();
        const pathname = core.http.basePath.prepend('/api/security/saml/callback');

        return response.ok({
          body: {
            SAMLResponse: await createSAMLResponse({
              kibanaUrl: `${protocol}://${hostname}:${port}${pathname}`,
              username: request.body.username,
              full_name: request.body.full_name ?? undefined,
              email: request.body.email ?? undefined,
              roles: request.body.roles,
            }),
          },
        });
      }
    );

    core.http.resources.register(
      {
        path: MOCK_IDP_LOGOUT_PATH,
        validate: false,
        options: { authRequired: false },
      },
      async (context, request, response) => {
        return response.redirected({ headers: { location: '/' } });
      }
    );
  },
  start() {},
  stop() {},
});
