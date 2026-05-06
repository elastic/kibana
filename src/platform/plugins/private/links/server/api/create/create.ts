/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { LINKS_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { LinksAttributes } from '../../types';
import { getLinksCRUResponseBody } from '../get_cru_response_body';
import type { LinksCreateRequestBody, LinksCreateResponseBody } from './types';

export async function create(
  requestCtx: RequestHandlerContext,
  createBody: LinksCreateRequestBody
): Promise<LinksCreateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);

  const savedObject = await core.savedObjects.client.create<LinksAttributes>(
    LINKS_SAVED_OBJECT_TYPE,
    createBody
  );

  return getLinksCRUResponseBody(savedObject);
}
