/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import type {
  dashboardLinkSchema,
  externalLinkOptionsSchema,
  externalLinkSchema,
  linksByReferenceSchema,
  linksByValueSchema,
  linksEmbeddableSchema,
  linksApiStateSchema,
} from './api/schemas';

export type LinksByValueState = z.output<typeof linksByValueSchema>;
export type LinksByReferenceState = z.output<typeof linksByReferenceSchema>;
export type LinksEmbeddableState = z.output<typeof linksEmbeddableSchema>;
export type LinksApiState = z.output<typeof linksApiStateSchema>;

export type DashboardLink = z.output<typeof dashboardLinkSchema>;
export type ExternalLink = z.output<typeof externalLinkSchema>;
export type ExternalLinkOptions = z.output<typeof externalLinkOptionsSchema>;
export type Link = DashboardLink | ExternalLink;
export type LinkOptions = DashboardLink['options'] | ExternalLinkOptions;
