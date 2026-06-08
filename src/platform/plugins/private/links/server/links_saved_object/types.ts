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
  externalLinkOptionsSchema,
  externalLinkSchema,
  linksByValueSchema,
} from '../api/schemas';

export type DashboardLink = TypeOf<typeof dashboardLinkSchema>;
export type ExternalLink = TypeOf<typeof externalLinkSchema>;
export type ExternalLinkOptions = TypeOf<typeof externalLinkOptionsSchema>;
export type Link = DashboardLink | ExternalLink;
export type LinkOptions = DashboardLink['options'] | ExternalLinkOptions;

export type LinksState = TypeOf<typeof linksByValueSchema>;

export type StoredLink = StoredDashboardLink | StoredExternalLink;
export type StoredLinksState = Omit<LinksState, 'links'> & {
  links?: StoredLink[];
};
export type StoredDashboardLink = Omit<DashboardLink, 'destination'> &
  DeprecatedLinkProperties & {
    destinationRefName: string;
  };
type StoredExternalLink = ExternalLink & DeprecatedLinkProperties;

// For BWC, optionally include deprecated props in StoredLink states so they can be transformed away
interface DeprecatedLinkProperties {
  order?: number;
  id?: string;
}
