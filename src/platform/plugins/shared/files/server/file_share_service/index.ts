/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { InternalFileShareService } from './internal_file_share_service';
export type {
  CreateShareArgs,
  DeleteArgs as DeleteShareArgs,
  DeleteForFileArgs as DeleteSharesForFileArgs,
  GetArgs as GetShareArgs,
  ListArgs as ListSharesArgs,
  UpdateArgs as UpdateShareArgs,
} from './internal_file_share_service';
export type { FileShareServiceStart } from './types';
