/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { getDashboardCRUResponseBody } from '../saved_object_utils';
import type { DashboardReadResponseBody } from './types';

export async function read(
  requestCtx: RequestHandlerContext,
  id: string
): Promise<DashboardReadResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const {
    saved_object: savedObject,
    outcome,

    alias_purpose,

    alias_target_id,
  } = await core.savedObjects.client.resolve<DashboardSavedObjectAttributes>(
    DASHBOARD_SAVED_OBJECT_TYPE,
    id
  );

  const response = getDashboardCRUResponseBody(savedObject, 'read');
  return {
    ...response,
    meta: {
      ...response.meta,
      alias_target_id,
      alias_purpose,
      outcome,
    },
  };
}
