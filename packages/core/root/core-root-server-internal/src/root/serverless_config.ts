/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

// Config validation for how to run Kibana in Serverless mode.
// Clients need to specify the project type to run in.
// Going for a simple `serverless` string because it serves as
// a direct replacement to the legacy --serverless CLI flag.
// If we even decide to extend this further, and converting it into an object,
// BWC can be ensured by adding the object definition as another alternative to `schema.oneOf`.

export const VALID_SERVERLESS_PROJECT_TYPES = ['es', 'oblt', 'security'];

const serverlessConfigSchema = schema.maybe(
  schema.oneOf(
    VALID_SERVERLESS_PROJECT_TYPES.map((projectName) => schema.literal(projectName)) as [
      Type<(typeof VALID_SERVERLESS_PROJECT_TYPES)[number]> // This cast is needed because it's different to Type<T>[] :sight:
    ]
  )
);

export type ServerlessConfigType = TypeOf<typeof serverlessConfigSchema>;

export const serverlessConfig: ServiceConfigDescriptor<ServerlessConfigType> = {
  path: 'serverless',
  schema: serverlessConfigSchema,
};
