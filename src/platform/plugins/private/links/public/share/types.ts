/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Warnings } from '@kbn/dashboard-plugin/server/api/types';
import type { LinksItem } from '../../common/content_management';

export type ExportJsonStatus = 'loading' | 'success' | 'error';

/** The response body type for sanitizing a dashboard. */
export interface LinksSanitizeResponseBody {
  data: LinksItem;
  warnings: Warnings;
}
