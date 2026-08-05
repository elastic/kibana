/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import { SavedObjectsErrorHelpers, type RequestHandlerContext } from '@kbn/core/server';

import { MARKDOWN_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { StoredMarkdownState } from '../../markdown_saved_object';
import type { MarkdownCreateResponseBody } from '../create';
import { create } from '../create/create';
import { getMarkdownCRUResponseBody } from '../get_cru_response_body';
import type { MarkdownUpdateRequestBody, MarkdownUpdateResponseBody } from './types';

export async function update(
  requestCtx: RequestHandlerContext,
  id: string,
  updateBody: MarkdownUpdateRequestBody
): Promise<{
  body: MarkdownCreateResponseBody | MarkdownUpdateResponseBody;
  operation: 'create' | 'update';
}> {
  const { core } = await requestCtx.resolve(['core']);

  // Determine whether the library item already exists.
  let isNewLibraryItem = false;
  try {
    await core.savedObjects.client.get<StoredMarkdownState>(MARKDOWN_SAVED_OBJECT_TYPE, id);
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw e;
    }
    isNewLibraryItem = true;
  }

  // Create path
  if (isNewLibraryItem) {
    asCodeIdSchema.validate(id);
    const body = await create(requestCtx, updateBody, id);
    return { body, operation: 'create' };
  }

  // Update path (existing library item)
  const savedObject = await core.savedObjects.client.update<StoredMarkdownState>(
    MARKDOWN_SAVED_OBJECT_TYPE,
    id,
    updateBody,
    {
      upsert: updateBody,
      /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
      mergeAttributes: false,
    }
  );

  return { body: getMarkdownCRUResponseBody(savedObject), operation: 'update' };
}
