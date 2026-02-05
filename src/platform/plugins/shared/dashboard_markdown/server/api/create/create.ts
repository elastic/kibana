/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import { MARKDOWN_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { MarkdownCreateRequestBody, MarkdownCreateRequestParams } from './types';
import { getMarkdownCRUResponseBody } from '../../saved_object_utils';
import type { MarkdownCreateResponseBody } from './types';
import type { MarkdownSavedObjectAttributes } from '../../markdown_saved_object';

export async function create(
  requestCtx: RequestHandlerContext,
  createParams: MarkdownCreateRequestParams,
  createBody: MarkdownCreateRequestBody
): Promise<MarkdownCreateResponseBody> {
  const { core } = await requestCtx.resolve(['core']);

  const savedObject = await core.savedObjects.client.create<MarkdownSavedObjectAttributes>(
    MARKDOWN_SAVED_OBJECT_TYPE,
    createBody,
    { ...(createParams?.id && { id: createParams.id }) }
  );

  return getMarkdownCRUResponseBody(savedObject, 'create');
}
