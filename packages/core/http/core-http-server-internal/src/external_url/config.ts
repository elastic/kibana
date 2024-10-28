/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { IExternalUrlPolicy } from '@kbn/core-http-common';

/**
 * @internal
 */
export type ExternalUrlConfigType = TypeOf<typeof externalUrlConfigSchema>;

const policySchema = schema.object({
  allow: schema.boolean(),
  host: schema.maybe(schema.string()),
  protocol: schema.maybe(
    schema.string({
      validate: (value) => {
        // tools.ietf.org/html/rfc3986#section-3.1
        // scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
        const schemaRegex = /^[a-zA-Z][a-zA-Z0-9\+\-\.]*$/;
        if (!schemaRegex.test(value))
          throw new Error(
            'Protocol must begin with a letter, and can only contain letters, numbers, and the following characters: `+ - .`'
          );
      },
    })
  ),
});

const externalUrlConfigSchema = schema.object({
  policy: schema.arrayOf<IExternalUrlPolicy>(policySchema, {
    defaultValue: [
      {
        allow: true,
      },
    ],
  }),
});

export const externalUrlConfig: ServiceConfigDescriptor<ExternalUrlConfigType> = {
  path: 'externalUrl',
  schema: externalUrlConfigSchema,
};
