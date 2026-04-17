/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { lastValueFrom } from 'rxjs';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { schema } from '@kbn/config-schema';
import type {
  CoreSetup,
  IRouter,
  IUiSettingsClient,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { EsqlService } from '../services/esql_service';

import type { EsqlServerPluginStart } from '../types';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

const MAX_FIELDS = 1000;

const getSourceNames = async (client: ElasticsearchClient): Promise<string[]> => {
  const service = new EsqlService({ client });
  const sources = await service.getAllIndices('local');
  return sources.filter((s) => !s.hidden).map((s) => s.name);
};

const getFieldsForSource = async (client: ElasticsearchClient, source: string): Promise<string> => {
  const response = await client.fieldCaps({
    index: source,
    fields: '*',
    include_unmapped: false,
  });

  const fields = Object.entries(response.fields)
    .filter(([fieldName]) => !fieldName.startsWith('_'))
    .slice(0, MAX_FIELDS)
    .map(([fieldName, types]) => {
      const type = Object.keys(types)[0];
      return `${fieldName}: ${type}`;
    });

  const totalCount = Object.keys(response.fields).length;
  let result = fields.join('\n');
  if (totalCount > MAX_FIELDS) {
    result += `\n(truncated, showing ${MAX_FIELDS} of ${totalCount} fields)`;
  }

  return result;
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

const buildSystemPrompt = (sourceNames: string[], fieldsContext?: string): string => {
  let prompt = `Produce the ES|QL query fenced by the esql tag. Don't explain it.

<AvailableSources>
The user's cluster has the following data sources:
${sourceNames.join(', ')}
Use these exact source names in the FROM clause. Do not invent source names.
</AvailableSources>`;

  if (fieldsContext) {
    prompt += `

<FieldsContext>
The relevant source has the following fields (name: type):
${fieldsContext}
Use these exact field names in the query.
</FieldsContext>`;
  }

  return prompt;
};

const extractEsqlQuery = (content: string): string => {
  const match = content.match(/```esql\s*([\s\S]*?)```/);
  return match ? match[1].trim() : content.trim();
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
          query: schema.string(),
          sources: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 50 })),
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
        const { query, sources } = request.body;
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

        const sourceNames = sources?.length ? sources : await getSourceNames(client);

        let fieldsContext: string | undefined;
        if (sources?.length) {
          try {
            fieldsContext = await getFieldsForSource(client, sources.join(','));
          } catch {
            // proceed without field context, less precision but still useful
          }
        }

        const result = await lastValueFrom(
          naturalLanguageToEsql({
            client: inference.getClient({ request }),
            connectorId,
            input: query,
            functionCalling: 'auto',
            logger,
            system: buildSystemPrompt(sourceNames, fieldsContext),
          })
        );

        return response.ok({
          body: { content: extractEsqlQuery(result.content ?? '') },
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
