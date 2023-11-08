/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializer, Plugin } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import {
  MOCK_IDP_LOGIN_PATH,
  MOCK_IDP_LOGOUT_PATH,
  createSAMLResponse,
  parseSAMLAuthnRequest,
} from '../common';

export const plugin: PluginInitializer<void, void> = (): Plugin => ({
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

        const samlResponse = await createSAMLResponse({
          authnRequestId: samlRequest.ID,
          kibanaUrl: samlRequest.AssertionConsumerServiceURL,
          username: 'test_user',
          roles: ['superuser'],
        });

        return response.renderHtml({
          body: `
            <!DOCTYPE html>
            <title>Kibana SAML Login</title>
            <link rel="icon" href="data:,">
            <body>
              <pre>${samlRequest.ID}</pre>
              <form id="loginForm" method="post" action="${samlRequest.AssertionConsumerServiceURL}">
                  <input name="SAMLResponse" type="text" value="${samlResponse}" />
                  <button>Login</button>
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
        return response.redirected({ headers: { location: '/logout?SAMLResponse=something' } });
      }
    );

    let attemptsCounter = 0;
    core.http.resources.register(
      {
        path: '/mock_idp/never_login',
        validate: false,
        options: { authRequired: false },
      },
      async (context, request, response) => {
        return response.renderHtml({
          body: `
            <!DOCTYPE html>
            <title>Kibana SAML Login</title>
            <link rel="icon" href="data:,">
            <body data-test-subj="idp-page">
              <span>Attempt #${++attemptsCounter}</span>
            </body>
          `,
        });
      }
    );
  },
  start() {},
  stop() {},
});
