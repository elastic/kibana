/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';

import { schema } from '@kbn/config-schema';
import type {
  AuthenticatedUser,
  CoreSetup,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import {
  CREATE_PATH,
  JOB_ATTACH_PATH,
  JOB_DETACH_PATH,
  JOB_PATH,
  JOB_RUN_PATH,
  JOB_SAVED_OBJECT_TYPE,
  JOBS_PATH,
  OPERATION_TYPE,
  STATUS_PATH,
  WHOAMI_PATH,
  WORKLOAD_TYPE,
} from '../common/constants';
import type { ExampleJob, JobBindingSummary, JobLastRun, SerializedUser } from '../common/types';
import type { SaExampleJobAttributes } from './saved_object';

const EXAMPLE_AUTHZ = {
  enabled: false as const,
  reason:
    'Developer-only example plugin loaded with --run-examples; attach/detach still require manage_security inside Core.',
};

const TITLE_MAX_LENGTH = 256;
const DESCRIPTION_MAX_LENGTH = 4096;
const NAME_MAX_LENGTH = 128;
const ID_MAX_LENGTH = 1024;

const jobIdParamsSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: ID_MAX_LENGTH }),
});

const createJobBodySchema = schema.object({
  title: schema.string({ minLength: 1, maxLength: TITLE_MAX_LENGTH }),
  description: schema.maybe(schema.string({ maxLength: DESCRIPTION_MAX_LENGTH })),
});

const attachBodySchema = schema.object({
  serviceAccountId: schema.string({ minLength: 1, maxLength: ID_MAX_LENGTH }),
});

const createAccountBodySchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: NAME_MAX_LENGTH }),
});

export interface RegisterRoutesOptions {
  router: IRouter;
  getStartServices: CoreSetup['getStartServices'];
  operationHandle: ReturnType<CoreSetup['security']['serviceAccounts']['registerOperation']>;
  logger: Logger;
  getSpaceId: (request: KibanaRequest) => string;
}

const serializeUser = (user: AuthenticatedUser | null): SerializedUser | null => {
  if (!user) {
    return null;
  }

  return {
    username: user.username,
    roles: user.roles,
    profile_uid: user.profile_uid,
    authentication_realm: user.authentication_realm,
    lookup_realm: user.lookup_realm,
    authentication_provider: user.authentication_provider,
    authentication_type: user.authentication_type,
    http_authentication_scheme: user.http_authentication_scheme ?? undefined,
    elastic_cloud_user: user.elastic_cloud_user,
  };
};

const toErrorResponse = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  logger.error(error instanceof Error ? error : new Error(String(error)));

  if (Boom.isBoom(error)) {
    return response.customError({
      statusCode: error.output.statusCode,
      body: { message: error.message },
    });
  }

  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

  return response.customError({
    statusCode,
    body: { message: error instanceof Error ? error.message : String(error) },
  });
};

const summarizeBinding = (
  binding: Awaited<ReturnType<RegisterRoutesOptions['operationHandle']['getBinding']>>
): JobBindingSummary | null => {
  if (!binding) {
    return null;
  }

  return {
    serviceAccountId: binding.serviceAccountId,
    spaceId: binding.spaceId,
    attachedAt: binding.attachedAt,
    attachedBy: binding.attachedBy,
  };
};

const toExampleJob = async ({
  id,
  attributes,
  spaceId,
  operationHandle,
}: {
  id: string;
  attributes: SaExampleJobAttributes;
  spaceId: string;
  operationHandle: RegisterRoutesOptions['operationHandle'];
}): Promise<ExampleJob> => {
  const binding = await operationHandle.getBinding({
    workloadType: WORKLOAD_TYPE,
    workloadId: id,
    spaceId,
  });

  return {
    id,
    title: attributes.title,
    description: attributes.description,
    lastRun: attributes.lastRun,
    binding: summarizeBinding(binding),
  };
};

const loadJob = async (
  soClient: SavedObjectsClientContract,
  id: string
): Promise<SaExampleJobAttributes> => {
  const savedObject = await soClient.get<SaExampleJobAttributes>(JOB_SAVED_OBJECT_TYPE, id);
  return savedObject.attributes;
};

export const createSpaceIdGetter = (spaces?: SpacesPluginSetup) => {
  return (request: KibanaRequest): string => {
    return spaces?.spacesService.getSpaceId(request) ?? 'default';
  };
};

export const registerRoutes = ({
  router,
  getStartServices,
  operationHandle,
  logger,
  getSpaceId,
}: RegisterRoutesOptions): void => {
  router.get(
    {
      path: STATUS_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: false,
    },
    async (_context, request, response) => {
      const [coreStart] = await getStartServices();
      return response.ok({
        body: {
          operationType: OPERATION_TYPE,
          workloadType: WORKLOAD_TYPE,
          isEnabled: coreStart.security.serviceAccounts.isEnabled(),
          spaceId: getSpaceId(request),
        },
      });
    }
  );

  router.get(
    {
      path: WHOAMI_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: false,
    },
    async (_context, request, response) => {
      const [coreStart] = await getStartServices();
      return response.ok({
        body: {
          currentUser: serializeUser(coreStart.security.authc.getCurrentUser(request)),
        },
      });
    }
  );

  router.post(
    {
      path: CREATE_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal', body: { maxBytes: 16384 } },
      validate: { body: createAccountBodySchema },
    },
    async (_context, request, response) => {
      try {
        const [coreStart] = await getStartServices();
        const account = await coreStart.security.serviceAccounts.create(request, request.body);
        return response.ok({ body: { via: 'core.security.serviceAccounts.create', account } });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.get(
    {
      path: JOBS_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const found = await soClient.find<SaExampleJobAttributes>({
          type: JOB_SAVED_OBJECT_TYPE,
          perPage: 100,
          sortField: 'title',
          sortOrder: 'asc',
        });
        const spaceId = getSpaceId(request);
        const jobs = await Promise.all(
          found.saved_objects.map((savedObject) =>
            toExampleJob({
              id: savedObject.id,
              attributes: savedObject.attributes,
              spaceId,
              operationHandle,
            })
          )
        );
        return response.ok({ body: { jobs } });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: JOBS_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal', body: { maxBytes: 16384 } },
      validate: { body: createJobBodySchema },
    },
    async (context, request, response) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const created = await soClient.create<SaExampleJobAttributes>(JOB_SAVED_OBJECT_TYPE, {
          title: request.body.title,
          description: request.body.description,
        });
        return response.ok({
          body: {
            job: await toExampleJob({
              id: created.id,
              attributes: created.attributes,
              spaceId: getSpaceId(request),
              operationHandle,
            }),
          },
        });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.get(
    {
      path: JOB_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: { params: jobIdParamsSchema },
    },
    async (context, request, response) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const attributes = await loadJob(soClient, request.params.id);
        return response.ok({
          body: {
            job: await toExampleJob({
              id: request.params.id,
              attributes,
              spaceId: getSpaceId(request),
              operationHandle,
            }),
          },
        });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.delete(
    {
      path: JOB_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: { params: jobIdParamsSchema },
    },
    async (context, request, response) => {
      try {
        await operationHandle.detach(request, {
          workloadType: WORKLOAD_TYPE,
          workloadId: request.params.id,
        });
        const soClient = (await context.core).savedObjects.client;
        await soClient.delete(JOB_SAVED_OBJECT_TYPE, request.params.id);
        return response.ok({ body: { deleted: true } });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: JOB_ATTACH_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal', body: { maxBytes: 16384 } },
      validate: { params: jobIdParamsSchema, body: attachBodySchema },
    },
    async (context, request, response) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const attributes = await loadJob(soClient, request.params.id);
        await operationHandle.attach(request, {
          serviceAccountId: request.body.serviceAccountId,
          workloadType: WORKLOAD_TYPE,
          workloadId: request.params.id,
        });
        return response.ok({
          body: {
            job: await toExampleJob({
              id: request.params.id,
              attributes,
              spaceId: getSpaceId(request),
              operationHandle,
            }),
          },
        });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: JOB_DETACH_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: { params: jobIdParamsSchema },
    },
    async (context, request, response) => {
      try {
        const soClient = (await context.core).savedObjects.client;
        const attributes = await loadJob(soClient, request.params.id);
        await operationHandle.detach(request, {
          workloadType: WORKLOAD_TYPE,
          workloadId: request.params.id,
        });
        return response.ok({
          body: {
            job: await toExampleJob({
              id: request.params.id,
              attributes,
              spaceId: getSpaceId(request),
              operationHandle,
            }),
          },
        });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );

  router.post(
    {
      path: JOB_RUN_PATH,
      security: { authz: EXAMPLE_AUTHZ },
      options: { access: 'internal' },
      validate: { params: jobIdParamsSchema },
    },
    async (context, request, response) => {
      try {
        const [coreStart] = await getStartServices();
        const soClient = (await context.core).savedObjects.client;
        const attributes = await loadJob(soClient, request.params.id);
        const spaceId = getSpaceId(request);
        const coords = {
          workloadType: WORKLOAD_TYPE,
          workloadId: request.params.id,
          spaceId,
        };

        const you = serializeUser(coreStart.security.authc.getCurrentUser(request));

        let scoped: JobLastRun['scoped'];
        try {
          scoped = await operationHandle.withScopedRequest(coords, async (scopedRequest) => {
            const kibanaUser = serializeUser(
              coreStart.security.authc.getCurrentUser(scopedRequest)
            );

            let esAuthenticate: unknown;
            let esAuthenticateError: string | undefined;
            try {
              esAuthenticate = await coreStart.elasticsearch.client
                .asScoped(scopedRequest)
                .asCurrentUser.security.authenticate();
            } catch (error) {
              esAuthenticateError = error instanceof Error ? error.message : String(error);
            }

            return { kibanaUser, esAuthenticate, esAuthenticateError };
          });
        } catch (error) {
          scoped = {
            kibanaUser: null,
            esAuthenticate: undefined,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        const lastRun: JobLastRun = {
          at: new Date().toISOString(),
          you,
          scoped,
        };

        await soClient.update<SaExampleJobAttributes>(JOB_SAVED_OBJECT_TYPE, request.params.id, {
          lastRun,
        });

        return response.ok({
          body: {
            job: await toExampleJob({
              id: request.params.id,
              attributes: {
                ...attributes,
                lastRun,
              },
              spaceId,
              operationHandle,
            }),
          },
        });
      } catch (error) {
        return toErrorResponse(error, response, logger);
      }
    }
  );
};
