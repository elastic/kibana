/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  dashboardLinkSchema,
  externalLinkSchema,
  linksSchema,
  linksCreateOptionsSchema,
  linksCreateResultSchema,
  linksGetResultSchema,
  linksSearchOptionsSchema,
  linksUpdateOptionsSchema,
} from './cm_services';

export type DashboardLink = TypeOf<typeof dashboardLinkSchema>;
export type ExternalLink = TypeOf<typeof externalLinkSchema>;
export type Link = DashboardLink | ExternalLink;
export type LinkOptions = DashboardLink['options'] | ExternalLink['options'];

export type LinksState = TypeOf<typeof linksSchema>;
export type StoredLinksState = Omit<LinksState, 'links'> & {
  links?: Array<StoredDashboardLink | ExternalLink>;
};
export type StoredDashboardLink = Omit<DashboardLink, 'destination'> & {
  destinationRefName: string;
};

export type LinksCreateOptions = TypeOf<typeof linksCreateOptionsSchema>;
export type LinksUpdateOptions = TypeOf<typeof linksUpdateOptionsSchema>;
export type LinksSearchOptions = TypeOf<typeof linksSearchOptionsSchema>;

export type LinksGetOut = TypeOf<typeof linksGetResultSchema>;
export type LinksCreateOut = TypeOf<typeof linksCreateResultSchema>;
export type LinksUpdateOut = TypeOf<typeof linksCreateResultSchema>;
