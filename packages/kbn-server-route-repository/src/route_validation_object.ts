/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';

const anyObject = schema.object({}, { unknowns: 'allow' });

export const routeValidationObject = {
  // `body` can be null, but `validate` expects non-nullable types
  // if any validation is defined. Not having validation currently
  // means we don't get the payload. See
  // https://github.com/elastic/kibana/issues/50179
  body: schema.nullable(schema.oneOf([anyObject, schema.string()])),
  params: anyObject,
  query: anyObject,
};
