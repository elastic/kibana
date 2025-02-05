/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiHasParentApi } from '@kbn/presentation-publishing';

interface HasCompressed {
  compressed: boolean;
}

const apiHasCompressed = (unknownApi: unknown): unknownApi is HasCompressed => {
  return Boolean(unknownApi) && typeof (unknownApi as HasCompressed).compressed === 'boolean';
};

export function isCompressed(api: unknown): boolean {
  if (apiHasCompressed(api)) return api.compressed;
  return apiHasParentApi(api) ? isCompressed(api.parentApi) : true;
}
