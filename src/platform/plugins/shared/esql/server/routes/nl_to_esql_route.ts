/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  IRouter,
  IUiSettingsClient,
  PluginInitializerContext,
} from '@kbn/core/server';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { generateEsql, generateEsqlCompletion } from '@kbn/agent-builder-genai-utils';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

const MAX_NL_INSTRUCTION_LENGTH = 2000;

/**
 * Wraps the editor's current buffer as additional context for {@link generateEsql} when
 * the request is not a completion: the user has typed something but is asking for a fresh query.
 */
const buildNlToEsqlAdditionalContext = (currentQuery: string): string => {
  if (!currentQuery) return '';
  return [
    'The user is in the ES|QL editor. Below is their current query.',
    'If the request is about changing, extending, or fixing that query, treat it as the starting point.',
    'If the request is for a new or unrelated query, you may produce a full replacement.',
    '',
    '<current_query>',
    currentQuery,
    '</current_query>',
  ].join('\n');
};

import type { EsqlServerPluginStart } from '../types';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

const createScopedModel = async ({
  inference,
  request,
  connectorId,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
}): Promise<ScopedModel> => {
  const chatModel = await inference.getChatModel({ request, connectorId, chatModelOptions: {} });
  const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
  const connector = await inference.getConnectorById(connectorId, request);

  return { connector, chatModel, inferenceClient };
};

const resolveConnectorId = async ({
  uiSettingsClient,
  inference,
  request,
}: {
  uiSettingsClient: IUiSettingsClient;
  inference: InferenceServerStart;
  request: KibanaRequest;
}): Promise<string | undefined> => {
  try {
    const defaultSetting = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    if (defaultSetting && defaultSetting !== NO_DEFAULT_CONNECTOR) {
      return defaultSetting;
    }
  } catch {
    // UI setting may not be registered, fall through
  }

  try {
    const connector = await inference.getDefaultConnector(request);
    return connector?.connectorId;
  } catch {
    // no connectors available
  }

  return undefined;
};

export const registerNLtoESQLRoute = (
  router: IRouter,
  getStartServices: CoreSetup<EsqlServerPluginStart>['getStartServices'],
  context: PluginInitializerContext
) => {
  router.post(
    {
      path: NL_TO_ESQL_ROUTE,
      validate: {
        body: schema.object({
          nlInstruction: schema.string({ maxLength: MAX_NL_INSTRUCTION_LENGTH }),
          currentQuery: schema.maybe(schema.string({ maxLength: 50000 })),
          isCompletion: schema.maybe(schema.boolean()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
    },
    async (requestHandlerContext, request, response) => {
      const logger = context.logger.get();
      try {
        const { nlInstruction, currentQuery, isCompletion } = request.body;
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;
        const [, { inference }] = await getStartServices();

        const connectorId = await resolveConnectorId({
          uiSettingsClient: core.uiSettings.client,
          inference,
          request,
        });

        if (!connectorId) {
          return response.badRequest({
            body: {
              message: 'No AI connector configured. Please set up a connector to use this feature.',
            },
          });
        }

        const model = await createScopedModel({ inference, request, connectorId });
        const trimmedCurrent = currentQuery?.trim();
        const isCompletionRequest = Boolean(isCompletion && trimmedCurrent);
        const signal = getRequestAbortedSignal(request.events.aborted$);

        if (isCompletionRequest) {
          const { content, replacesNext } = await generateEsqlCompletion({
            model,
            esClient: client,
            logger,
            nlInstruction,
            currentQuery: trimmedCurrent ?? '',
            signal,
          });
          return response.ok({
            body: { content, replacesNext },
          });
        }

        const additionalContext = buildNlToEsqlAdditionalContext(trimmedCurrent ?? '');

        const result = await generateEsql({
          model,
          esClient: client,
          logger,
          nlQuery: nlInstruction,
          additionalContext,
          executeQuery: false,
        });

        return response.ok({
          body: { content: result.query },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`NL to ES|QL failed: ${errorMessage}`);
        if (
          error instanceof Error &&
          'reason' in error &&
          typeof (error as { reason: string }).reason === 'string' &&
          (error as { reason: string }).reason.startsWith('license_')
        ) {
          return response.forbidden({
            body: { message: errorMessage },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: errorMessage },
        });
      }
    }
  );
};
