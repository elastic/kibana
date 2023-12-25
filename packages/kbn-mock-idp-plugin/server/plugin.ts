/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializer, Plugin } from '@kbn/core-plugins-server';
import { schema } from '@kbn/config-schema';

import {
  MOCK_IDP_LOGIN_PATH,
  MOCK_IDP_LOGOUT_PATH,
  createSAMLResponse,
  parseSAMLAuthnRequest,
} from '../common';

export const plugin: PluginInitializer<void, void> = async (): Promise<Plugin> => ({
  setup(core) {
    core.http.resources.register(
      {
        path: MOCK_IDP_LOGIN_PATH,
        validate: {
          query: schema.object({
            SAMLRequest: schema.string(),
          }),
        },
        options: { authRequired: false },
      },
      async (context, request, response) => {
        let samlRequest: Awaited<ReturnType<typeof parseSAMLAuthnRequest>>;
        try {
          samlRequest = await parseSAMLAuthnRequest(request.query.SAMLRequest);
        } catch (error) {
          return response.badRequest({
            body: '[request query.SAMLRequest]: value is not valid SAMLRequest.',
          });
        }

        const userRoles: Array<[string, string]> = [
          ['system_indices_superuser', 'system_indices_superuser'],
          ['t1_analyst', 't1_analyst'],
          ['t2_analyst', 't2_analyst'],
          ['t3_analyst', 't3_analyst'],
          ['threat_intelligence_analyst', 'threat_intelligence_analyst'],
          ['rule_author', 'rule_author'],
          ['soc_manager', 'soc_manager'],
          ['detections_admin', 'detections_admin'],
          ['platform_engineer', 'platform_engineer'],
          ['endpoint_operations_analyst', 'endpoint_operations_analyst'],
          ['endpoint_policy_manager', 'endpoint_policy_manager'],
        ];

        const samlResponses = await Promise.all(
          userRoles.map(([username, role]) =>
            createSAMLResponse({
              authnRequestId: samlRequest.ID,
              kibanaUrl: samlRequest.AssertionConsumerServiceURL,
              username,
              roles: [role],
            })
          )
        );

        return response.renderHtml({
          body: `
            <!DOCTYPE html>
            <title>Mock Identity Provider</title>
            <link rel="icon" href="data:,">
            <body>
              <h2>Mock Identity Provider</h2>
              <form id="loginForm" method="post" action="${
                samlRequest.AssertionConsumerServiceURL
              }">
                <h3>Pick a role:<h3>
                <ul>
                  ${userRoles
                    .map(
                      ([username], i) =>
                        `
                    <li>
                      <button name="SAMLResponse" value="${samlResponses[i]}">${username}</button>
                    </li>
                    `
                    )
                    .join('')}
                </ul>
              </form>
            </body>
          `,
        });
      }
    );

    core.http.resources.register(
      {
        path: `${MOCK_IDP_LOGIN_PATH}/submit.js`,
        validate: false,
        options: { authRequired: false },
      },
      (context, request, response) => {
        return response.renderJs({ body: 'document.getElementById("loginForm").submit();' });
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
