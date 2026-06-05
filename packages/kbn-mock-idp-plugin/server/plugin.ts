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
import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Plugin, PluginInitializer } from '@kbn/core-plugins-server';
import {
  readRolesFromResource,
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
} from '@kbn/es';
import type { ServerlessProductTier } from '@kbn/es/src/utils';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  createSAMLResponse,
  MOCK_IDP_LOGIN_PATH,
  MOCK_IDP_LOGOUT_PATH,
  MOCK_IDP_SP_BASE_URL,
  projectTypeToAlias,
} from '@kbn/mock-idp-utils';
import { parseSAMLRequest } from '@kbn/mock-idp-utils/src/utils';
import { z } from '@kbn/zod';

import type { ConfigType } from './config';
import { MockIdpRolePromptTemplate } from './role_prompt';

export interface PluginSetupDependencies {
  cloud: CloudSetup;
}

export interface PluginStartDependencies {
  inference?: InferenceServerStart;
  features?: FeaturesPluginStart;
}

const roleSchema = z.object({
  kibana: z.array(
    z.object({
      id: z.string(),
      access: z.enum(['all', 'read']),
      space: z.string(),
    })
  ),
  elasticsearch: z.array(
    z.object({
      index: z.string(),
      access: z.enum(['all', 'read']),
    })
  ),
  accessToSystemIndices: z.enum(['all', 'read', 'none']),
});

const createSAMLResponseSchema = schema.object({
  username: schema.string(),
  full_name: schema.maybe(schema.nullable(schema.string())),
  email: schema.maybe(schema.nullable(schema.string())),
  roles: schema.arrayOf(schema.string()),
  url: schema.string(),
});

const tierSpecificRolesFileExists = (filePath: string): boolean => {
  try {
    return existsSync(filePath);
  } catch (e) {
    return false;
  }
};

const readServerlessRoles = (projectType: string, productTier?: ServerlessProductTier) => {
  if (projectTypeToAlias.has(projectType)) {
    const alias = projectTypeToAlias.get(projectType)!;

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

function constructRole(
  userQuery: string,
  roleName: string,
  features: KibanaFeature[],
  llmResponse: z.infer<typeof roleSchema>
) {
  const indices = llmResponse.elasticsearch.map((es) => ({
    names: [es.index],
    privileges: [es.access === 'all' ? 'all' : 'read'],
    field_security: { grant: ['*'], except: [] as string[] },
    allow_restricted_indices: es.index.startsWith('.'),
  }));

  if (llmResponse.accessToSystemIndices !== 'none') {
    indices.push({
      names: ['*'],
      privileges: [llmResponse.accessToSystemIndices],
      field_security: { grant: ['*'], except: [] },
      allow_restricted_indices: true,
    });
  }

  const kibana: Array<{ spaces: string[]; base: string[]; feature: Record<string, string[]> }> = [];

  if (llmResponse.kibana.length > 0) {
    const privilegesBySpace = llmResponse.kibana.reduce((acc, k) => {
      const existing = acc.get(k.space) ?? [];
      existing.push(k);
      acc.set(k.space, existing);
      return acc;
    }, new Map<string, typeof llmResponse.kibana>());

    for (const [space, privileges] of privilegesBySpace) {
      const basePrivilege = privileges.find((k) => k.id === 'base');
      const featurePrivileges: Array<[string, string[]]> = [];

      if (!basePrivilege) {
        for (const k of privileges) {
          const validFeature = features.find((f) => f.id === k.id);
          if (!validFeature) {
            throw new Error(`Feature with ID "${k.id}" is not supported.`);
          }
          const access = validFeature.privileges?.all.disabled
            ? 'read'
            : validFeature.privileges?.read?.disabled
            ? 'all'
            : k.access;
          featurePrivileges.push([k.id, [access]]);
        }
      }

      kibana.push({
        spaces: [space.toLowerCase().trim().replace(/\s+/g, '_')],
        base: basePrivilege ? [basePrivilege.access] : [],
        feature: featurePrivileges.length > 0 ? Object.fromEntries(featurePrivileges) : {},
      });
    }
  }

  return {
    description: `generated_${roleName}: ${userQuery}`,
    kibana,
    elasticsearch: { cluster: [] as string[], indices, run_as: [] as string[] },
  };
}

export const plugin: PluginInitializer<
  void,
  void,
  PluginSetupDependencies,
  PluginStartDependencies
> = async (
  initializerContext
): Promise<Plugin<void, void, PluginSetupDependencies, PluginStartDependencies>> => {
  let credentials: string;

  return {
    setup(core: CoreSetup<PluginStartDependencies>, plugins: PluginSetupDependencies) {
      const logger = initializerContext.logger.get();
      const roleLogger = initializerContext.logger.get('ai-mock-idp-role');
      const config = initializerContext.config.get<ConfigType>();
      const router = core.http.createRouter();

      credentials = plugins.cloud?.serverless?.projectType
        ? `Basic ${btoa('elastic_serverless:changeme')}`
        : `Basic ${btoa('elastic:changeme')}`;

      core.http.registerOnPreResponse((r, p, t) => {
        // We only care about 302 redirects to the Mock IDP login/logout pages.
        const location = p.headers?.location;
        if (
          p.statusCode !== 302 ||
          typeof location !== 'string' ||
          !location.startsWith(`${MOCK_IDP_SP_BASE_URL}/mock_idp/`)
        ) {
          return t.next();
        }

        // Rewrite to a path-only Location so the browser resolves the redirect against its own
        // origin - that way the redirect just works regardless of where Kibana is actually served
        // from (dev proxy with a random base path, custom port, HTTPS, a reverse proxy, …) and
        // ES SAML realm config does not need to know the real Kibana URL.
        return t.next({
          headers: {
            location: `${core.http.basePath.serverBasePath}${location.slice(
              MOCK_IDP_SP_BASE_URL.length
            )}`,
          },
        });
      });

      core.http.resources.register(
        {
          path: MOCK_IDP_LOGIN_PATH,
          validate: false,
          security: {
            authc: {
              enabled: false,
              reason:
                'This route simulates a mock identity provider and does not require authentication.',
            },
            authz: { enabled: false, reason: '' },
          },
        },
        async (context, request, response) => {
          return response.renderAnonymousCoreApp();
        }
      );

      // caching roles on the first call
      const roles: string[] = [];
      const generatedRoles: string[] = [];

      router.get(
        {
          path: '/mock_idp/supported_roles',
          validate: false,
          security: {
            authc: {
              enabled: false,
              reason:
                'This route simulates a mock identity provider and does not require authentication.',
            },
            authz: { enabled: false, reason: '' },
          },
        },
        async (context, request, response) => {
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

            // Fetch all roles from Kibana to discover generated roles that persist across restarts.
            const publicBaseUrl = core.http.basePath.publicBaseUrl ?? MOCK_IDP_SP_BASE_URL;
            const allRolesResponse = await fetch(`${publicBaseUrl}/api/security/role`, {
              headers: { Authorization: credentials, 'kbn-xsrf': 'true' },
            });

            let resolvedGeneratedRoles = generatedRoles;
            if (allRolesResponse.ok) {
              const allRoles: Array<{ name: string; description?: string }> =
                await allRolesResponse.json();
              resolvedGeneratedRoles = allRoles
                .filter((r) => r.description?.startsWith('generated_'))
                .map((r) => r.name);
              // Keep in-memory list in sync
              generatedRoles.length = 0;
              generatedRoles.push(...resolvedGeneratedRoles);
            }

            return response.ok({
              body: { roles, generatedRoles: resolvedGeneratedRoles },
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
          security: {
            authc: {
              enabled: false,
              reason:
                'This route simulates a mock identity provider and does not require authentication.',
            },
            authz: { enabled: false, reason: '' },
          },
        },
        async (context, request, response) => {
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
            const samlRequestInfo = await parseSAMLRequest(request.body.url);
            if (samlRequestInfo?.requestId) {
              logger.info(`Sending SAML response for request ID: ${samlRequestInfo.requestId}`);
            }

            const parsed = new URL(request.body.url, 'https://localhost');
            const relayState = parsed.searchParams.get('RelayState') ?? undefined;

            // Kibana-bound ACS URLs are intentionally left to the `onPreResponse` rewrite above;
            // we only override here for external SPs (e.g. UIAM).
            const externalAcsUrl =
              samlRequestInfo?.acsUrl && !samlRequestInfo.acsUrl.startsWith(MOCK_IDP_SP_BASE_URL)
                ? samlRequestInfo.acsUrl
                : undefined;

            return response.ok({
              body: {
                SAMLResponse: await createSAMLResponse({
                  username: request.body.username,
                  full_name: request.body.full_name ?? undefined,
                  email: request.body.email ?? undefined,
                  roles: request.body.roles,
                  ...(samlRequestInfo?.requestId
                    ? { authnRequestId: samlRequestInfo.requestId }
                    : {}),
                  ...(samlRequestInfo?.issuer ? { spEntityId: samlRequestInfo.issuer } : {}),
                  ...(externalAcsUrl ? { acsUrl: externalAcsUrl } : {}),
                  ...serverlessOptions,
                }),
                ...(relayState ? { RelayState: relayState } : {}),
                // Echoed alongside SAMLResponse so the browser's auto-submitted form posts to UIAM
                // instead of the default Kibana ACS endpoint (see mock_idp_page form action).
                ...(externalAcsUrl ? { acsUrl: externalAcsUrl } : {}),
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
          security: {
            authc: {
              enabled: false,
              reason:
                'This route simulates a mock identity provider and does not require authentication.',
            },
            authz: { enabled: false, reason: '' },
          },
        },
        async (context, request, response) => {
          return response.redirected({ headers: { location: '/' } });
        }
      );

      router.post(
        {
          path: '/mock_idp/uiam/grant_api_key',
          validate: {
            body: schema.object({
              name: schema.string(),
              expiration: schema.maybe(schema.string()),
              authcScheme: schema.maybe(schema.string()),
              credential: schema.maybe(schema.string()),
            }),
          },
          security: { authz: { enabled: false, reason: 'Mock IDP plugin for testing' } },
        },
        async (context, request, response) => {
          try {
            const { name, authcScheme, credential, expiration } = request.body;
            const [
              {
                security: { authc },
              },
            ] = await core.getStartServices();

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

            const result = await authc.apiKeys.uiam?.grant(requestToUse, {
              name,
              expiration,
            });

            if (!result) {
              return response.badRequest({
                body: { message: 'Failed to grant API key' },
              });
            }

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
          path: '/mock_idp/uiam/call_scoped_client_with_api_key',
          validate: {
            body: schema.object({
              apiKey: schema.string(),
            }),
          },
          security: {
            authc: { enabled: 'optional', reason: 'Mock IDP plugin for testing' },
            authz: { enabled: false, reason: 'Mock IDP plugin for testing' },
          },
        },
        async (context, request, response) => {
          try {
            const [{ elasticsearch }] = await core.getStartServices();

            // Get scoped client with UIAM headers
            const scopedClient = elasticsearch.client.asScoped({
              headers: { authorization: `ApiKey ${request.body.apiKey}` },
            });

            if (!scopedClient) {
              return response.badRequest({
                body: { message: 'UIAM is not enabled or not available' },
              });
            }

            // Call Elasticsearch info endpoint to verify the API key works
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
          path: '/mock_idp/uiam/invalidate_api_key',
          validate: {
            body: schema.object({
              apiKeyId: schema.string(),
              authcScheme: schema.string(),
              credential: schema.string(),
            }),
          },
          security: {
            authc: {
              enabled: 'optional',
              reason: 'Mock IDP plugin for testing UIAM operations',
            },
            authz: { enabled: false, reason: 'Mock IDP plugin for testing' },
          },
        },
        async (context, request, response) => {
          try {
            const { apiKeyId, authcScheme, credential } = request.body;
            const [
              {
                security: { authc },
              },
            ] = await core.getStartServices();

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

            const result = await authc.apiKeys.uiam?.invalidate(requestToUse, {
              id: apiKeyId,
            });

            if (!result) {
              return response.badRequest({
                body: { message: 'Failed to invalidate API key' },
              });
            }

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

      router.post(
        {
          path: '/mock_idp/uiam/convert_api_keys',
          validate: {
            body: schema.object({
              keys: schema.arrayOf(schema.string(), { minSize: 1 }),
            }),
          },
          security: {
            authc: {
              enabled: 'optional',
              reason: 'Mock IDP plugin for testing UIAM operations',
            },
            authz: { enabled: false, reason: 'Mock IDP plugin for testing' },
          },
        },
        async (context, request, response) => {
          try {
            const { keys } = request.body;
            const [
              {
                security: { authc },
              },
            ] = await core.getStartServices();

            const result = await authc.apiKeys.uiam?.convert(keys);

            if (!result) {
              return response.badRequest({
                body: { message: 'Failed to convert API keys' },
              });
            }

            return response.ok({
              body: result,
            });
          } catch (err) {
            logger.error(`Failed to convert API keys via UIAM: ${err}`, err);
            return response.customError({
              statusCode: 500,
              body: { message: err.message },
            });
          }
        }
      );
      router.get(
        {
          path: '/mock_idp/ai_connectors',
          validate: false,
          security: {
            authc: {
              enabled: false,
              reason:
                'This route simulates a mock identity provider and does not require authentication.',
            },
            authz: { enabled: false, reason: '' },
          },
        },
        async (context, request, response) => {
          const [, startDeps] = await core.getStartServices();
          const inference = startDeps.inference;
          if (!inference) {
            return response.ok({ body: { connectors: [], defaultConnectorId: null } });
          }
          try {
            const inferenceRequest = kibanaRequestFactory({
              headers: { authorization: credentials },
              path: '/',
            });
            const [connectors, defaultConnector] = await Promise.all([
              inference.getConnectorList(inferenceRequest),
              inference.getDefaultConnector(inferenceRequest),
            ]);
            return response.ok({
              body: {
                connectors: connectors
                  .filter((c) =>
                    Object.values(defaultInferenceEndpoints).includes(c.connectorId as any)
                  )
                  .map((c) => ({ connectorId: c.connectorId, name: c.name })),
                defaultConnectorId: defaultConnector?.connectorId ?? null,
              },
            });
          } catch (err) {
            roleLogger.error(`Failed to fetch connectors: ${err}`);
            return response.customError({ statusCode: 500, body: err.message });
          }
        }
      );

      router.post(
        {
          path: '/mock_idp/ai_generate_role',
          validate: {
            body: schema.object({
              description: schema.string(),
              connectorId: schema.maybe(schema.string()),
            }),
          },
          security: {
            authc: {
              enabled: false,
              reason:
                'This route simulates a mock identity provider and does not require authentication.',
            },
            authz: { enabled: false, reason: '' },
          },
        },
        async (context, request, response) => {
          const [, startDeps] = await core.getStartServices();
          const inference = startDeps.inference;
          const features = startDeps.features;

          if (!inference) {
            return response.badRequest({ body: 'Inference plugin is not available.' });
          }
          if (!features) {
            return response.badRequest({ body: 'Features plugin is not available.' });
          }

          try {
            roleLogger.info(`Starting role generation for: "${request.body.description}"`);

            const inferenceRequest = kibanaRequestFactory({
              headers: { authorization: credentials },
              path: '/',
            });

            let connectorId = request.body.connectorId;
            if (!connectorId) {
              const defaultConnector = await inference.getDefaultConnector(inferenceRequest);
              if (!defaultConnector) {
                return response.badRequest({ body: 'No default inference connector configured.' });
              }
              connectorId = defaultConnector.connectorId;
            }
            roleLogger.info(`Using connector: ${connectorId}`);

            const chatModel = await inference.getChatModel({
              request: inferenceRequest,
              connectorId,
              chatModelOptions: {},
            });
            roleLogger.info('Chat model ready, invoking LLM');

            const kibanaFeatures = features.getKibanaFeatures();
            const featureIds = kibanaFeatures.map((f) => f.id).concat(['base']) as [
              string,
              ...string[]
            ];
            const dynamicRoleSchema = z.object({
              kibana: z.array(
                z.object({
                  id: z.enum(featureIds),
                  access: z.enum(['all', 'read']),
                  space: z.string(),
                })
              ),
              elasticsearch: z.array(
                z.object({
                  index: z.string(),
                  access: z.enum(['all', 'read']),
                })
              ),
              accessToSystemIndices: z.enum(['all', 'read', 'none']),
            });

            const prompt = new MockIdpRolePromptTemplate();
            const chain = prompt.pipe(chatModel.withStructuredOutput(dynamicRoleSchema));

            const llmRole = await chain.invoke({
              features: kibanaFeatures,
              userQuery: request.body.description,
              projectType: plugins.cloud?.serverless?.projectType,
            });
            roleLogger.info(`LLM response: ${JSON.stringify(llmRole)}`);

            const roleName = uniqueNamesGenerator({
              dictionaries: [adjectives, animals],
              length: 2,
              separator: '_',
            });

            const roleBody = constructRole(
              request.body.description,
              roleName,
              kibanaFeatures,
              llmRole
            );
            roleLogger.info(`Constructed role "${roleName}": ${JSON.stringify(roleBody)}`);

            const publicBaseUrl = core.http.basePath.publicBaseUrl ?? MOCK_IDP_SP_BASE_URL;
            const roleApiUrl = `${publicBaseUrl}/api/security/role/${encodeURIComponent(
              roleName
            )}?createOnly=true`;
            roleLogger.info(`Calling role API: PUT ${roleApiUrl}`);

            const apiResponse = await fetch(roleApiUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'kbn-xsrf': 'true',
                Authorization: credentials,
              },
              body: JSON.stringify(roleBody),
            });
            roleLogger.info(`Role API response status: ${apiResponse.status}`);

            if (!apiResponse.ok) {
              const errorText = await apiResponse.text();
              throw new Error(`Role API returned ${apiResponse.status}: ${errorText}`);
            }

            generatedRoles.push(roleName);
            return response.ok({ body: { roleName, ...roleBody, llmRole } });
          } catch (err) {
            roleLogger.error(`Failed to generate role from description: ${err}`);
            return response.customError({ statusCode: 500, body: err.message });
          }
        }
      );
    },
    start() {},
    stop() {},
  };
};
