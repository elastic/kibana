/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { MAX_DISCOVER_SESSION_TABS } from '@kbn/saved-search-plugin/common';
import { dataTableJsonViewFieldsToOmit } from '../embeddable/schema_override';
import {
  discoverSessionApiDataSchema,
  discoverSessionApiResponseSchema,
  discoverSessionClassicTabSchema,
  discoverSessionEsqlTabSchema,
  discoverSessionGetResponseSchema,
  discoverSessionWarningsSchema,
} from './schema';

const restrictedApiTabSchema = z.union([
  discoverSessionClassicTabSchema.omit(dataTableJsonViewFieldsToOmit),
  discoverSessionEsqlTabSchema.omit(dataTableJsonViewFieldsToOmit),
]);
const restrictedTabsSchema = z
  .array(restrictedApiTabSchema)
  .min(1)
  .max(MAX_DISCOVER_SESSION_TABS)
  .refine(
    (tabs) => new Set(tabs.map(({ id }) => id)).size === tabs.length,
    'tabs must have unique ids'
  )
  .meta({
    description:
      'Ordered list of tabs in the Discover session. Each tab requires a stable, unique ID because Dashboard panels and Discover links can reference it.',
  });
const restrictedApiDataSchema = discoverSessionApiDataSchema
  .extend({ tabs: restrictedTabsSchema })
  .meta(discoverSessionApiDataSchema.meta() ?? {});
const restrictedApiResponseSchema = discoverSessionApiResponseSchema.extend({
  data: restrictedApiDataSchema,
});
const restrictedGetResponseSchema = restrictedApiResponseSchema.extend({
  warnings: discoverSessionWarningsSchema.optional(),
});

const canonicalApiSchemas = {
  discoverSessionApiDataSchema,
  discoverSessionApiResponseSchema,
  discoverSessionGetResponseSchema,
};
const restrictedApiSchemas = {
  discoverSessionApiDataSchema: restrictedApiDataSchema,
  discoverSessionApiResponseSchema: restrictedApiResponseSchema,
  discoverSessionGetResponseSchema: restrictedGetResponseSchema,
};

/** Selects the canonical schemas or their feature-restricted variants. */
export const getDiscoverSessionApiSchemas = ({
  dataTableJsonView,
}: {
  readonly dataTableJsonView: boolean;
}) => (dataTableJsonView ? canonicalApiSchemas : restrictedApiSchemas);
