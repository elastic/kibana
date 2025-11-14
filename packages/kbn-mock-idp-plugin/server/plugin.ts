/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { Plugin, PluginInitializer } from '@kbn/core-plugins-server';
import {
  readRolesFromResource,
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
} from '@kbn/es';
import type { ServerlessProductTier } from '@kbn/es/src/utils';
import { createSAMLResponse, MOCK_IDP_LOGIN_PATH, MOCK_IDP_LOGOUT_PATH } from '@kbn/mock-idp-utils';

import type { ConfigType } from './config';

export interface PluginSetupDependencies {
  cloud: CloudSetup;
}

const createSAMLResponseSchema = schema.object({
  username: schema.string(),
  full_name: schema.maybe(schema.nullable(schema.string())),
  email: schema.maybe(schema.nullable(schema.string())),
  roles: schema.arrayOf(schema.string()),
});

// BOOKMARK - List of Kibana project types
const projectToAlias = new Map<string, string>([
  ['observability', 'oblt'],
  ['security', 'security'],
  ['search', 'es'],
  ['workplace_ai', 'workplace_ai'],
]);

const tierSpecificRolesFileExists = (filePath: string): boolean => {
  try {
    return existsSync(filePath);
  } catch (e) {
    return false;
  }
};

const readServerlessRoles = (projectType: string, productTier?: ServerlessProductTier) => {
  if (projectToAlias.has(projectType)) {
    const alias = projectToAlias.get(projectType)!;

    const tierSpecificRolesResourcePath =
      productTier && resolve(SERVERLESS_ROLES_ROOT_PATH, alias, productTier, 'roles.yml');
    const rolesResourcePath =
      tierSpecificRolesResourcePath && tierSpecificRolesFileExists(tierSpecificRolesResourcePath)
        ? tierSpecificRolesResourcePath
        : resolve(SERVERLESS_ROLES_ROOT_PATH, alias, 'roles.yml');

    return readRolesFromResource(rolesResourcePath);
  } else {
    throw new Error(`Unsupported projectType: ${projectType}`);
  }
};

const readStatefulRoles = () => {
  const rolesResourcePath = resolve(STATEFUL_ROLES_ROOT_PATH, 'roles.yml');
  return readRolesFromResource(rolesResourcePath);
};

export type CreateSAMLResponseParams = TypeOf<typeof createSAMLResponseSchema>;

export const plugin: PluginInitializer<void, void, PluginSetupDependencies> = async (
  initializerContext
): Promise<Plugin> => {
  let getAuthenticationService: (() => any) | undefined;

  return {
    setup(core, plugins: PluginSetupDependencies) {
      const logger = initializerContext.logger.get();
      const config = initializerContext.config.get<ConfigType>();
      const router = core.http.createRouter();

      core.http.resources.register(
        {
          path: MOCK_IDP_LOGIN_PATH,
          validate: false,
          options: { authRequired: false },
          security: { authz: { enabled: false, reason: '' } },
        },
        async (context, request, response) => {
          return response.renderAnonymousCoreApp();
        }
      );

      // caching roles on the first call
      const roles: string[] = [];

      router.get(
        {
          path: '/mock_idp/supported_roles',
          validate: false,
          options: { authRequired: false },
          security: { authz: { enabled: false, reason: '' } },
        },
        (context, request, response) => {
          try {
            if (roles.length === 0) {
              const projectType = plugins.cloud?.serverless?.projectType;
              const productTier = plugins.cloud?.serverless?.productTier;
              roles.push(
                ...(projectType
                  ? readServerlessRoles(projectType, productTier)
                  : readStatefulRoles())
              );
            }
            return response.ok({
              body: {
                roles,
              },
            });
          } catch (err) {
            return response.customError({ statusCode: 500, body: err.message });
          }
        }
      );

      router.post(
        {
          path: '/mock_idp/saml_response',
          validate: {
            body: createSAMLResponseSchema,
          },
          options: { authRequired: false },
          security: { authz: { enabled: false, reason: '' } },
        },
        async (context, request, response) => {
          const { protocol, hostname, port } = core.http.getServerInfo();
          const pathname = core.http.basePath.prepend('/api/security/saml/callback');

          const serverlessOptions = plugins.cloud?.serverless
            ? {
                serverless: {
                  organizationId: plugins.cloud.organizationId!,
                  projectType: plugins.cloud.serverless.projectType!,
                  uiamEnabled: !!config.uiam?.enabled,
                },
              }
            : {};

          try {
            return response.ok({
              body: {
                SAMLResponse: await createSAMLResponse({
                  kibanaUrl: `${protocol}://${hostname}:${port}${pathname}`,
                  username: request.body.username,
                  full_name: request.body.full_name ?? undefined,
                  email: request.body.email ?? undefined,
                  roles: request.body.roles,
                  ...serverlessOptions,
                }),
              },
            });
          } catch (err) {
            logger.error(`Failed to create SAMLResponse: ${err}`, err);
            throw err;
          }
        }
      );

      core.http.resources.register(
        {
          path: MOCK_IDP_LOGOUT_PATH,
          validate: false,
          options: { authRequired: false },
          security: { authz: { enabled: false, reason: '' } },
        },
        async (context, request, response) => {
          return response.redirected({ headers: { location: '/' } });
        }
      );

      router.post(
        {
          path: '/mock_idp/grant_api_key',
          validate: {
            body: schema.object({
              name: schema.string(),
              expiration: schema.maybe(schema.string()),
              authcScheme: schema.maybe(schema.string()),
              credential: schema.maybe(schema.string()),
              isForUiam: schema.maybe(schema.boolean()),
            }),
          },
          security: { authz: { enabled: false, reason: 'Mock IDP plugin for testing' } },
        },
        async (context, request, response) => {
          try {
            if (!getAuthenticationService) {
              return response.badRequest({
                body: { message: 'Authentication service not available yet' },
              });
            }

            const { name, authcScheme, credential, isForUiam, expiration } = request.body;
            const authcService = getAuthenticationService();

            // Create a new request with authentication header if authcScheme and credential are provided
            let requestToUse = request;
            if (authcScheme && credential) {
              const requestHeaders: Headers = {
                ...request.headers,
                authorization: `${authcScheme} ${credential}`,
              };
              const fakeRawRequest: FakeRawRequest = {
                headers: requestHeaders,
                path: request.url.pathname,
              };
              requestToUse = kibanaRequestFactory(fakeRawRequest);
            }

            const result = await authcService.apiKeys.grantAsInternalUser(
              requestToUse,
              { name, expiration },
              isForUiam
            );

            return response.ok({
              body: result,
            });
          } catch (err) {
            logger.error(`Failed to grant API key: ${err}`, err);
            return response.customError({
              statusCode: 500,
              body: { message: err.message },
            });
          }
        }
      );

      router.post(
        {
          path: '/mock_idp/call_scoped_client_with_uiam_api_key',
          validate: {
            body: schema.object({
              apiKey: schema.string(),
              authcScheme: schema.string(),
            }),
          },
          options: { authRequired: 'optional' },
          security: { authz: { enabled: false, reason: 'Mock IDP plugin for testing' } },
        },
        async (context, request, response) => {
          try {
            if (!getAuthenticationService) {
              return response.badRequest({
                body: { message: 'Authentication service not available yet' },
              });
            }

            const { apiKey, authcScheme } = request.body;
            const authcService = getAuthenticationService();

            const requestHeaders: Headers = {
              ...request.headers,
              authorization: `${authcScheme} ${apiKey}`,
            };
            const fakeRawRequest: FakeRawRequest = {
              headers: requestHeaders,
              path: request.url.pathname,
            };
            const requestToUse = kibanaRequestFactory(fakeRawRequest);

            // Get scoped client with UIAM headers
            const scopedClient = authcService.apiKeys.getScopedClusterClient(requestToUse);

            if (!scopedClient) {
              return response.badRequest({
                body: { message: 'UIAM is not enabled or not available' },
              });
            }

            // Call Elasticsearch info endpoint to verify the API key works
            // Note: info() doesn't require special security privileges unlike security.authenticate()
            const esInfo = await scopedClient.asCurrentUser.info();

            return response.ok({
              body: {
                cluster_name: esInfo.cluster_name,
                cluster_uuid: esInfo.cluster_uuid,
                version: esInfo.version,
                message: 'Successfully authenticated with API Key to ES',
              },
            });
          } catch (err) {
            logger.error(`Failed to authenticate to ES with UIAM API Key: ${err}`, err);
            return response.customError({
              statusCode: 500,
              body: { message: err.message },
            });
          }
        }
      );

      router.post(
        {
          path: '/mock_idp/invalidate_api_key_via_uiam',
          validate: {
            body: schema.object({
              apiKeyId: schema.string(),
              authcScheme: schema.string(),
              credential: schema.string(),
            }),
          },
          options: { authRequired: 'optional' },
          security: { authz: { enabled: false, reason: 'Mock IDP plugin for testing' } },
        },
        async (context, request, response) => {
          try {
            if (!getAuthenticationService) {
              return response.badRequest({
                body: { message: 'Authentication service not available yet' },
              });
            }

            const { apiKeyId, authcScheme, credential } = request.body;
            const authcService = getAuthenticationService();

            // Create a request with authentication header for UIAM
            const requestHeaders: Headers = {
              ...request.headers,
              authorization: `${authcScheme} ${credential}`,
            };
            const fakeRawRequest: FakeRawRequest = {
              headers: requestHeaders,
              path: request.url.pathname,
            };
            const requestToUse = kibanaRequestFactory(fakeRawRequest);

            const result = await authcService.apiKeys.invalidateViaUiam(requestToUse, apiKeyId);

            return response.ok({
              body: result,
            });
          } catch (err) {
            logger.error(`Failed to invalidate API key via UIAM: ${err}`, err);
            return response.customError({
              statusCode: 500,
              body: { message: err.message },
            });
          }
        }
      );
    },
    start(core) {
      getAuthenticationService = () => core.security.authc;
    },
    stop() {},
  };
};
