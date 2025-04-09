/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import { schema } from '@kbn/config-schema';

const filterPathSchema = schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 50 });

interface GlobalRouterRequestOptions {
  filterPath?: string[];
}

export function validateGlobalApiOpts(request: Request): GlobalRouterRequestOptions {
  let filterPath: undefined | string[];

  const rawFilterPath: unknown = request.query?.filter_path;
  if (typeof rawFilterPath === 'string') {
    filterPath = rawFilterPath.split(',');
  } else if (Array.isArray(rawFilterPath)) {
    filterPath = rawFilterPath;
  }

  if (filterPath) filterPathSchema.validate(filterPath);

  return {
    filterPath,
  };
}
