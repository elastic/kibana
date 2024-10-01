/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  apiHasCompressed,
  apiHasParentApi,
  type HasCompressed,
  type HasParentApi,
} from '@kbn/presentation-publishing';
import type { DefaultControlApi } from '../../controls/types';

export const isCompressed = (
  api: DefaultControlApi | HasParentApi | HasCompressed | null | unknown
): boolean => {
  if (apiHasCompressed(api)) {
    if (api?.compressed) return api.compressed;
    else if (apiHasParentApi(api)) return isCompressed(api.parentApi);
  }
  return true;
};
