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

type RuleTypeParams = [string, [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]];

export class AlertingOasPlugin implements Plugin {
  // private updateSchema: [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]] | undefined
  // private createSchema: Array<z.infer<typeof createBodySchema> | undefined
  private updateSchema: OpenAPIV3.SchemaObject | undefined;
  private createSchema: OpenAPIV3.SchemaObject | undefined;

  public setup({ http }: CoreSetup, { alerting }: { alerting: AlertingPluginSetup }) {
    const router = http.createRouter();
    router.get(
      {
        path: '/oas/alerting/create',
        validate: {},
      },
      async (context, req, res) => {
        if (!this.createSchema) throw new Error('paramsSchema is not initialized');

        return res.ok({
          body: this.createSchema,
        });
      }
    );

    router.get(
      {
        path: '/oas/alerting/update',
        validate: {},
      },
      async (context, req, res) => {
        if (!this.updateSchema) throw new Error('paramsSchema is not initialized');

        return res.ok({
          body: this.updateSchema,
        });
      }
    );
  }

  public start(core: CoreStart, { alerting }: { alerting: AlertingPluginStart }) {
    const ruleTypeParams = Array.from(
      alerting.listTypes({ addParamsValidationSchemas: true }).values()
    )
      .map((ruleType) => {
        if (ruleType.validate && instanceofZodType(ruleType.validate.params)) {
          return [ruleType.id, ruleType.validate.params];
        }
      })
      .filter(Boolean) as unknown as RuleTypeParams;

    this.updateSchema = this.getUpdateSchema(ruleTypeParams);
    this.createSchema = this.getCreateSchema(ruleTypeParams);
  }

  public stop() {}

  /**
   * When creating a rule, the user can use one of the predefined rule types.
   * Each rule type has its own schema for the params depending on the rule_type_id.
   */
  private getCreateSchema(ruleTypeParams: RuleTypeParams): OpenAPIV3.SchemaObject {
    // const schema = ruleTypeParams.reduce((acc, [ruleTypeId, paramsSchema]) => {
    //   return acc.merge(z.object({ [ruleTypeId]: paramsSchema }));
    // }, createBodySchema);

    const schemas = ruleTypeParams.map(([ruleTypeId, paramsSchema]) => {
      return createBodySchema
        .merge(z.object({ rule_type_id: z.literal(ruleTypeId as string) }))
        .merge(
          z.object({
            params: paramsSchema as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
          })
        );
    }, []);

    return zodToJsonSchema(z.discriminatedUnion('rule_type_id', schemas)) as any;
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

    return zodToJsonSchema(schemaWithParams) as any;
  }
}

export const plugin = () => new AlertingOasPlugin();
