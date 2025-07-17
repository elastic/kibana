/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf } from '@kbn/config-schema';
import {
  dashboardLinkSchema,
  linksSchema,
  linksCreateOptionsSchema,
  linksCreateResultSchema,
  linksGetResultSchema,
  linksSearchOptionsSchema,
  linksUpdateOptionsSchema,
} from './cm_services';

export type DashboardLink = TypeOf<typeof dashboardLinkSchema>;
export type ExternalLink = TypeOf<typeof externalLinkSchema>;

export type LinksState = TypeOf<typeof linksSchema>;
export type LinksSavedObjectAttributes = TypeOf<typeof linksSchema>;

export type LinksCreateOptions = TypeOf<typeof linksCreateOptionsSchema>;
export type LinksUpdateOptions = TypeOf<typeof linksUpdateOptionsSchema>;
export type LinksSearchOptions = TypeOf<typeof linksSearchOptionsSchema>;

export type LinksGetOut = TypeOf<typeof linksGetResultSchema>;
export type LinksCreateOut = TypeOf<typeof linksCreateResultSchema>;
export type LinksUpdateOut = TypeOf<typeof linksCreateResultSchema>;
