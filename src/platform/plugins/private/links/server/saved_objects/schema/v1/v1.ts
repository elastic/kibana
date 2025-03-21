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
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../../../common/content_management';

const baseLinkSchema = {
  id: schema.string(),
  label: schema.maybe(schema.string()),
  order: schema.number(),
};

export const dashboardLinkSchema = schema.object({
  ...baseLinkSchema,
  destinationRefName: schema.string(),
  type: schema.literal(DASHBOARD_LINK_TYPE),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.boolean(),
        useCurrentFilters: schema.boolean(),
        useCurrentDateRange: schema.boolean(),
      },
      { unknowns: 'forbid' }
    )
  ),
});

export const externalLinkSchema = schema.object({
  ...baseLinkSchema,
  type: schema.literal(EXTERNAL_LINK_TYPE),
  destination: schema.string(),
  options: schema.maybe(
    schema.object(
      {
        openInNewTab: schema.boolean(),
        encodeUrl: schema.boolean(),
      },
      { unknowns: 'forbid' }
    )
  ),
});

export const savedObjectLinksAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    links: schema.arrayOf(schema.oneOf([dashboardLinkSchema, externalLinkSchema])),
    layout: schema.maybe(
      schema.oneOf([schema.literal(LINKS_HORIZONTAL_LAYOUT), schema.literal(LINKS_VERTICAL_LAYOUT)])
    ),
  },
  { unknowns: 'forbid' }
);
