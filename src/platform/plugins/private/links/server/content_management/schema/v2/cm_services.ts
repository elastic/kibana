/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  dashboardLinkSchema as dashboardLinkSchemaV1,
  externalLinkSchema as externalLinkSchemaV1,
  linksSchema as linksSchemaV1,
} from '../v1';

const baseLinkSchemaExtension = {
  order: undefined,
};

export const dashboardLinkSchema = dashboardLinkSchemaV1.extends({
  ...baseLinkSchemaExtension,
});

export const externalLinkSchema = externalLinkSchemaV1.extends({
  ...baseLinkSchemaExtension,
});

export const linksArraySchema = schema.arrayOf(
  schema.oneOf([dashboardLinkSchema, externalLinkSchema]),
  {
    meta: { description: 'The list of links to display' },
  }
);

export const linksSchema = linksSchemaV1.extends({
  links: linksArraySchema,
});

export {
  externalLinkOptionsSchema,
  layoutSchema,
  linksSearchOptionsSchema,
  linksCreateOptionsSchema,
  linksUpdateOptionsSchema,
  linksGetResultSchema,
  linksCreateResultSchema,
} from '../v1';
