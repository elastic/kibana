/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { LINKS_LIBRARY_TYPE } from '../../../common';
import { transformIn } from '../../../common/embeddable/transforms/transform_in';
import type { StoredLinksState } from '../../links_saved_object';
import { getLinksCRUResponseBody } from '../get_cru_response_body';
import type { LinksUpdateRequestBody, LinksUpdateResponseBody } from './types';

export async function update(
  requestCtx: RequestHandlerContext,
  id: string,
  updateBody: LinksUpdateRequestBody
): Promise<LinksUpdateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);

  const { state: soState, references } = transformIn(updateBody);
  const savedObject = await core.savedObjects.client.update<StoredLinksState>(
    LINKS_LIBRARY_TYPE,
    id,
    soState,
    {
      references,
      upsert: soState,
      /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
      mergeAttributes: false,
    }
  );

  return getLinksCRUResponseBody(savedObject);
}
