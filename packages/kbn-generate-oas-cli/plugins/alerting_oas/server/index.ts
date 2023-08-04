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
import { instanceofZodType } from '@kbn/zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { OpenAPIV3 } from 'openapi-types';

export class AlertingOasPlugin implements Plugin {
  private jsonSchema: OpenAPIV3.SchemaObject | undefined;

  public setup({ http }: CoreSetup, { alerting }: { alerting: AlertingPluginSetup }) {
    const router = http.createRouter();
    router.get(
      {
        path: '/docs/alerting',
        validate: {},
      },
      async (context, req, res) => {
        return res.ok({ body: this.jsonSchema });
      }
    );
  }

  public start(core: CoreStart, { alerting }: { alerting: AlertingPluginStart }) {
    const jsonSchema = Array.from(alerting.listTypes({ addParamsValidationSchemas: true }).values())
      .map((ruleType) => {
        if (ruleType.validate && instanceofZodType(ruleType.validate.params)) {
          return zodToJsonSchema(ruleType.validate.params);
        }
      })
      .filter(Boolean);

    this.jsonSchema = jsonSchema as OpenAPIV3.SchemaObject;
  }

  public stop() {}
}

export const plugin = () => new AlertingOasPlugin();
