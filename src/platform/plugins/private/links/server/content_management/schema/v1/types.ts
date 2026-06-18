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
  externalLinkSchema,
  linksSchema,
  linksCreateOptionsSchema,
  linksCreateResultSchema,
  linksGetResultSchema,
  linksSearchOptionsSchema,
  linksUpdateOptionsSchema,
  externalLinkOptionsSchema,
} from './cm_services';

export type DashboardLink = z.output<typeof dashboardLinkSchema>;
export type ExternalLink = z.output<typeof externalLinkSchema>;
export type ExternalLinkOptions = z.output<typeof externalLinkOptionsSchema>;
export type Link = DashboardLink | ExternalLink;
export type LinkOptions = DashboardLink['options'] | ExternalLinkOptions;

export type LinksState = z.output<typeof linksSchema>;

export type StoredLink = StoredDashboardLink | StoredExternalLink;
export type StoredLinksState = Omit<LinksState, 'links'> & {
  links?: StoredLink[];
};
export type StoredDashboardLink = Omit<DashboardLink, 'destination'> &
  DeprecatedLinkProperties & {
    destinationRefName: string;
  };
type StoredExternalLink = ExternalLink & DeprecatedLinkProperties;

export type LinksCreateOptions = z.output<typeof linksCreateOptionsSchema>;
export type LinksUpdateOptions = z.output<typeof linksUpdateOptionsSchema>;
export type LinksSearchOptions = z.output<typeof linksSearchOptionsSchema>;

export type LinksGetOut = z.output<typeof linksGetResultSchema>;
export type LinksCreateOut = z.output<typeof linksCreateResultSchema>;
export type LinksUpdateOut = z.output<typeof linksCreateResultSchema>;

// For BWC, optionally include deprecated props in StoredLink states so they can be transformed away
interface DeprecatedLinkProperties {
  order?: number;
  id?: string;
}
