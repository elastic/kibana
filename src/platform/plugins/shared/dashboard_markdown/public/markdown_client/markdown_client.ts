/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { DeleteResult } from '@kbn/content-management-plugin/common';

import type { MarkdownSearchRequestBody, MarkdownSearchResponseBody } from '../../server/api';
import {
  MARKDOWN_API_PATH,
  MARKDOWN_API_VERSION,
  MARKDOWN_EMBEDDABLE_TYPE,
} from '../../common/constants';
import type {
  MarkdownCreateResponseBody,
  MarkdownReadResponseBody,
  MarkdownUpdateResponseBody,
} from '../../server';
import { coreServices } from '../services/kibana_services';
import type { MarkdownAttributes } from '../../server/markdown_saved_object';

export const markdownClient = {
  create: async (markdownState: MarkdownAttributes) => {
    return coreServices.http.post<MarkdownCreateResponseBody>(MARKDOWN_API_PATH, {
      version: MARKDOWN_API_VERSION,
      body: JSON.stringify(markdownState),
    });
  },
  delete: async (id: string): Promise<DeleteResult> => {
    return coreServices.http.delete(`${MARKDOWN_API_PATH}/${id}`, {
      version: MARKDOWN_API_VERSION,
    });
  },
  get: async (id: string): Promise<MarkdownReadResponseBody> => {
    const result = await coreServices.http
      .get<MarkdownReadResponseBody>(`${MARKDOWN_API_PATH}/${id}`, {
        version: MARKDOWN_API_VERSION,
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: MARKDOWN_EMBEDDABLE_TYPE, id });
        }
        const message = (e.body as { message?: string })?.message ?? e.message;
        throw new Error(message);
      });
    return result;
  },
  search: async (searchBody: MarkdownSearchRequestBody) => {
    return await coreServices.http.post<MarkdownSearchResponseBody>(`${MARKDOWN_API_PATH}/search`, {
      version: MARKDOWN_API_VERSION,
      body: JSON.stringify({
        ...searchBody,
        search: searchBody.search ? `${searchBody.search}*` : undefined,
      }),
    });
  },
  update: async (id: string, markdownState: MarkdownAttributes) => {
    const updateResponse = await coreServices.http.put<MarkdownUpdateResponseBody>(
      `${MARKDOWN_API_PATH}/${id}`,
      {
        version: MARKDOWN_API_VERSION,
        body: JSON.stringify(markdownState),
      }
    );
    return updateResponse;
  },
};
