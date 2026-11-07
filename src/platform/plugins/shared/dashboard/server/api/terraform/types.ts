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
  exportedDataViewSchema,
  libraryItemSchema,
  literalDataViewSchema,
  literalTagSchema,
  terraformResponseBodySchema,
} from './schemas';

export type LiteralTag = z.output<typeof literalTagSchema>;

export type LiteralDataView = z.output<typeof literalDataViewSchema>;

export type ExportedDataView = z.output<typeof exportedDataViewSchema>;

export type LibraryItem = z.output<typeof libraryItemSchema>;

/** The response body of the route converting a dashboard to Terraform. */
export type DashboardTerraformResponseBody = z.output<typeof terraformResponseBodySchema>;
