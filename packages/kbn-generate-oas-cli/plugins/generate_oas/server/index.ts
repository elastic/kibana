/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreStart, CoreSetup } from '@kbn/core/server';
import {
  PluginStartContract as AlertingPluginStart,
  PluginSetupContract as AlertingPluginSetup,
} from '@kbn/alerting-plugin/server';
import { instanceofZodType, z } from '@kbn/zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { bodySchema as updateBodySchema } from '@kbn/alerting-plugin/server/routes/update_rule';
import { bodySchema as createBodySchema } from '@kbn/alerting-plugin/server/routes/create_rule';
import { OpenAPIV3 } from 'openapi-types';
import { RegistryRuleType } from '@kbn/alerting-plugin/server/rule_type_registry';

type RuleTypeParams = Array<[string, z.ZodTypeAny]>;

interface PathsObject {
  paths: {
    [pattern: string]: PathItemObject;
  };
}

type PathItemObject = {
  [method in OpenAPIV3.HttpMethods]?: OperationObject;
};

interface OperationObject {
  requestBody: OpenAPIV3.RequestBodyObject;
}

export class ApiDocsPlugin implements Plugin {
  private alerting: PathsObject | undefined;

  public setup({ http }: CoreSetup, { alerting }: { alerting: AlertingPluginSetup }) {
    const router = http.createRouter();
    router.get(
      {
        path: '/generate_oas',
        validate: {},
      },
      async (context, req, res) => {
        if (!this.alerting) throw new Error('alerting schema is not initialized');

        return res.ok({
          body: this.alerting,
        });
      }
    );
  }

  public start(coreStart: CoreStart, { alerting }: { alerting: AlertingPluginStart }) {
    const ruleTypeParams = Array.from(
      alerting.listTypes({ addParamsValidationSchemas: true }).values()
    )
      .map((ruleType: RegistryRuleType) => {
        if (ruleType.validate && instanceofZodType(ruleType.validate.params)) {
          return [ruleType.id, ruleType.validate.params];
        }
      })
      .filter(Boolean) as unknown as RuleTypeParams;

    this.alerting = {
      paths: {
        '/api/alerting/rule/{id}': {
          post: {
            requestBody: {
              content: {
                'application/json; Elastic-Api-Version=2023-10-31': {
                  schema: this.getCreateSchema(ruleTypeParams),
                },
              },
            },
          },
          put: {
            requestBody: {
              content: {
                'application/json; Elastic-Api-Version=2023-10-31': {
                  schema: this.getUpdateSchema(ruleTypeParams),
                },
              },
            },
          },
        },
      },
    };
  }

  public stop() {}

  /**
   * When creating a rule, the user can use one of the predefined rule types.
   * Each rule type has its own schema for the params depending on the rule_type_id.
   */
  private getCreateSchema(ruleTypeParams: Array<[string, z.ZodTypeAny]>): OpenAPIV3.SchemaObject {
    const schemas = ruleTypeParams.map(([ruleTypeId, paramsSchema]) => {
      return createBodySchema
        .merge(z.object({ rule_type_id: z.literal(ruleTypeId as string) }))
        .merge(
          z.object({
            params: paramsSchema,
          })
        );
    }) as unknown as [
      z.ZodDiscriminatedUnionOption<'rule_type_id'>,
      ...Array<z.ZodDiscriminatedUnionOption<'rule_type_id'>>
    ];

    // discriminated union is used here because we would to use the oneOf option
    // this means that the valid params schema is different for each rule type
    return zodToJsonSchema(z.discriminatedUnion('rule_type_id', schemas), {
      target: 'openApi3',
      $refStrategy: 'none',
    }) as any;
  }

  /**
   * There is no rule_type_id here as it has already been set when creating. We will
   * just show a list of possible schemas of params parameter
   */
  private getUpdateSchema(ruleTypeParams: RuleTypeParams): OpenAPIV3.SchemaObject {
    const paramSchemas = ruleTypeParams.map(([, paramsSchema]) => paramsSchema) as [
      z.ZodTypeAny,
      z.ZodTypeAny,
      ...z.ZodTypeAny[]
    ];

    const schemaWithParams = updateBodySchema.merge(z.object({ params: z.union(paramSchemas) }));

    return zodToJsonSchema(schemaWithParams, { target: 'openApi3', $refStrategy: 'none' }) as any;
  }
}

export const plugin = () => new ApiDocsPlugin();
