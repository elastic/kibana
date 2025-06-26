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
  linksAttributesSchema,
  linksCreateOptionsSchema,
  linksCreateResultSchema,
  linksGetResultSchema,
  linksSearchOptionsSchema,
  linksUpdateOptionsSchema,
} from './cm_services';

export type LinksSavedObjectAttributes = TypeOf<typeof linksAttributesSchema>;

export type LinksCreateOptions = TypeOf<typeof linksCreateOptionsSchema>;
export type LinksUpdateOptions = TypeOf<typeof linksUpdateOptionsSchema>;
export type LinksSearchOptions = TypeOf<typeof linksSearchOptionsSchema>;

export type LinksGetOut = TypeOf<typeof linksGetResultSchema>;
export type LinksCreateOut = TypeOf<typeof linksCreateResultSchema>;
export type LinksUpdateOut = TypeOf<typeof linksCreateResultSchema>;
