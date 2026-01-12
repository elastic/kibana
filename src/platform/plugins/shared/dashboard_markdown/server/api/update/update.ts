/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { MarkdownSavedObjectAttributes } from '../../markdown_saved_object';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../../../common/constants';
import type { MarkdownUpdateRequestBody, MarkdownUpdateResponseBody } from './types';
import { getMarkdownCRUResponseBody } from '../../saved_object_utils';

export async function update(
  requestCtx: RequestHandlerContext,
  id: string,
  updateBody: MarkdownUpdateRequestBody
): Promise<MarkdownUpdateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);

  const savedObject = await core.savedObjects.client.update<MarkdownSavedObjectAttributes>(
    MARKDOWN_EMBEDDABLE_TYPE,
    id,
    updateBody.data,
    {
      ...(updateBody.references && { references: updateBody.references }),
      /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
      mergeAttributes: false,
    }
  );

  return getMarkdownCRUResponseBody(savedObject, 'update');
}
