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
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

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

const buildSurgicalPrompt = (currentQuery: string): string => {
  return `You are an ES|QL expert. The user has an existing ES|QL query.
The target comment line is marked with >>> and <<< delimiters in the query below.
That comment is a natural-language instruction describing what ES|QL code should replace it.
Other comment lines (without >>> <<<) are regular documentation comments — ignore them as instructions.

Your task: output ONLY the ES|QL pipe(s) that should replace the marked comment. Do not output the full query.
Fence the replacement code with the esql tag. Do not explain it.

If the instruction asks to modify or extend an existing pipe command (e.g. "also add ...", "change ...", "add a column"),
output the complete modified version of that pipe. Otherwise output only new pipe(s).

Before the code block, output exactly one of these lines:
  REPLACES_NEXT: true
  REPLACES_NEXT: false
Output "true" when your generated code is a modified version of the pipe immediately after the marked comment
(i.e. it should replace that pipe, not be added alongside it).
Output "false" when your generated code is new and should be inserted without removing any existing pipe.

<CurrentQuery>
${currentQuery}
</CurrentQuery>`;
};

const buildAdditionalContext = (currentQuery: string, isSurgical: boolean): string => {
  if (isSurgical && currentQuery) {
    return buildSurgicalPrompt(currentQuery);
  }
  if (currentQuery) {
    return [
      'The user is in the ES|QL editor. Below is their current query.',
      'If the request is about changing, extending, or fixing that query, treat it as the starting point.',
      'If the request is for a new or unrelated query, you may produce a full replacement.',
      '',
      '<current_query>',
      currentQuery,
      '</current_query>',
    ].join('\n');
  }
  return '';
};

const extractSurgicalResponse = (content: string): { esql: string; replacesNext: boolean } => {
  const codeMatch = content.match(/```esql\s*([\s\S]*?)```/);
  const esql = codeMatch ? codeMatch[1].trim() : content.trim();
  const flagMatch = content.match(/REPLACES_NEXT:\s*(true|false)/i);
  const replacesNext = flagMatch ? flagMatch[1].toLowerCase() === 'true' : false;
  return { esql, replacesNext };
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
          nlInstruction: schema.string(),
          currentQuery: schema.maybe(schema.string({ maxLength: 50000 })),
          isSurgical: schema.maybe(schema.boolean()),
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
        const { nlInstruction, currentQuery, isSurgical } = request.body;
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

        const additionalContext = buildAdditionalContext(trimmedCurrent ?? '', isSurgical ?? false);

        const result = await generateEsql({
          model,
          esClient: client,
          logger,
          nlQuery: nlInstruction,
          additionalContext,
          executeQuery: false,
        });

        const rawContent = result.query ?? '';
        if (currentQuery && isSurgical) {
          const { esql, replacesNext } = extractSurgicalResponse(rawContent);
          return response.ok({
            body: { content: esql, replacesNext },
          });
        }
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
