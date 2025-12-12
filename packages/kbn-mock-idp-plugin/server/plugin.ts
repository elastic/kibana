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
  ['workplaceai', 'workplaceai'],
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
): Promise<Plugin> => ({
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
              ...(projectType ? readServerlessRoles(projectType, productTier) : readStatefulRoles())
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
  },
  start() {},
  stop() {},
});
