/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const OAS_TAGS = ['oas-tag:advanced settings'];

export const settingsResponseSchema = schema.object(
  {
    settings: schema.recordOf(
      schema.string(),
      schema.object(
        {
          userValue: schema.maybe(
            schema.any({ meta: { description: 'The value set by the user for this setting.' } })
          ),
        },
        { unknowns: 'allow' }
      ),
      {
        meta: {
          description: 'All user-provided settings, keyed by setting name.',
        },
      }
    ),
  },
  { meta: { description: 'The user-provided settings.' } }
);

export const settingKeyParamSchema = schema.string({
  minLength: 1,
  maxLength: 1024,
  meta: {
    description:
      'The name of the setting, for example `defaultRoute`. Refer to the [advanced settings reference](https://www.elastic.co/docs/reference/kibana/advanced-settings) for the available settings.',
  },
});
