/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { IExternalUrlPolicy } from '.';

/**
 * @internal
 */
export type ExternalUrlConfigType = TypeOf<typeof config.schema>;

const allowSchema = schema.boolean();

const hostSchema = schema.string();

const protocolSchema = schema.string({
  validate: (value) => {
    // tools.ietf.org/html/rfc3986#section-3.1
    // scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    const schemaRegex = /^[a-zA-Z][a-zA-Z0-9\+\-\.]*$/;
    if (!schemaRegex.test(value))
      throw new Error(
        'Protocol must begin with a letter, and can only contain letters, numbers, and the following characters: `+ - .`'
      );
  },
});

const policySchema = schema.object({
  allow: allowSchema,
  protocol: schema.maybe(protocolSchema),
  host: schema.maybe(hostSchema),
});

export const config = {
  path: 'externalUrl',
  schema: schema.object({
    policy: schema.arrayOf<IExternalUrlPolicy>(policySchema, {
      defaultValue: [
        {
          allow: true,
        },
      ],
    }),
  }),
};
