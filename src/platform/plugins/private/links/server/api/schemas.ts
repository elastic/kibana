/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { dashboardNavigationOptionsSchema } from '@kbn/dashboard-navigation-options-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { DEFAULT_EXTERNAL_LINK_OPTIONS } from '../../common/constants';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/types';

const baseLinkSchema = {
  label: schema.maybe(
    schema.string({ meta: { description: 'The label of the link to be displayed in the UI' } })
  ),
};

export const dashboardLinkSchema = schema.object(
  {
    ...baseLinkSchema,
    type: schema.literal(DASHBOARD_LINK_TYPE),
    destination: schema.string({
      meta: { description: 'Linked dashboard saved object id' },
    }),
    options: dashboardNavigationOptionsSchema,
  },
  {
    meta: {
      id: `kbn-link-panel-type-${DASHBOARD_LINK_TYPE}`,
    },
  }
);

export const externalLinkOptionsSchema = schema.object(
  {
    open_in_new_tab: schema.boolean({
      meta: {
        description: 'Whether to open this link in a new tab when clicked',
      },
      defaultValue: DEFAULT_EXTERNAL_LINK_OPTIONS.open_in_new_tab,
    }),
    encode_url: schema.boolean({
      meta: {
        description: 'Whether to escape the URL with percent encoding',
      },
      defaultValue: DEFAULT_EXTERNAL_LINK_OPTIONS.encode_url,
    }),
  },
  { defaultValue: DEFAULT_EXTERNAL_LINK_OPTIONS, unknowns: 'forbid' }
);

export const externalLinkSchema = schema.object(
  {
    ...baseLinkSchema,
    type: schema.literal(EXTERNAL_LINK_TYPE),
    destination: schema.string({ meta: { description: 'The external URL to link to' } }),
    options: externalLinkOptionsSchema,
  },
  {
    meta: {
      id: `kbn-link-type-${EXTERNAL_LINK_TYPE}`,
    },
  }
);

export const linksArraySchema = schema.arrayOf(
  schema.discriminatedUnion('type', [dashboardLinkSchema, externalLinkSchema]),
  {
    meta: { description: 'The list of links to display' },
    maxSize: 100,
  }
);

// Shared schema for layout - used by both saved objects and embeddables
export const layoutSchema = schema.maybe(
  schema.oneOf([schema.literal(LINKS_HORIZONTAL_LAYOUT), schema.literal(LINKS_VERTICAL_LAYOUT)], {
    meta: {
      description: 'Denote whether to display the links in a horizontal or vertical layout',
    },
  })
);

export const linksSchema = serializedTitlesSchema.extends(
  {
    links: linksArraySchema,
    layout: layoutSchema,
  },
  { unknowns: 'forbid' }
);
