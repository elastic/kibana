/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { list_id } from '../../common/list_id';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';

export const exportListItemQuerySchema = t.exact(
  t.type({
    list_id,
    // TODO: Add file_name here with a default value
  })
);

export type ExportListItemQuerySchema = RequiredKeepUndefined<
  t.TypeOf<typeof exportListItemQuerySchema>
>;
export type ExportListItemQuerySchemaEncoded = t.OutputOf<typeof exportListItemQuerySchema>;
