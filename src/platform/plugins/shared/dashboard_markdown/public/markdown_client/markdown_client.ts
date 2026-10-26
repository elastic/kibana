/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPath } from '@kbn/core-http-browser';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { DeleteResult } from '@kbn/content-management-plugin/common';

import type {
  MarkdownSearchRequestQuery,
  MarkdownSearchResponseBody,
  MarkdownUpdateRequestBody,
} from '../../server/api';
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
import type { MarkdownCreateRequestBody } from '../../server';

export const markdownClient = {
  create: async (markdownState: MarkdownCreateRequestBody) => {
    return coreServices.http.post<MarkdownCreateResponseBody>(MARKDOWN_API_PATH, {
      version: MARKDOWN_API_VERSION,
      body: JSON.stringify(markdownState),
    });
  },
  delete: async (id: string): Promise<DeleteResult> => {
    return coreServices.http.delete(buildPath(`${MARKDOWN_API_PATH}/{id}`, { id }), {
      version: MARKDOWN_API_VERSION,
    });
  },
  get: async (id: string): Promise<MarkdownReadResponseBody> => {
    return await coreServices.http
      .get<MarkdownReadResponseBody>(buildPath(`${MARKDOWN_API_PATH}/{id}`, { id }), {
        version: MARKDOWN_API_VERSION,
      })
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: MARKDOWN_EMBEDDABLE_TYPE, id });
        }
        const message = (e.body as { message?: string })?.message ?? e.message;
        throw new Error(message);
      });
  },
  search: async (searchQuery: MarkdownSearchRequestQuery) => {
    const { query, ...params } = searchQuery;
    return await coreServices.http.get<MarkdownSearchResponseBody>(MARKDOWN_API_PATH, {
      version: MARKDOWN_API_VERSION,
      query: {
        ...params,
        ...(query ? { query: `${query}*` } : {}),
      },
    });
  },
  update: async (id: string, markdownState: MarkdownUpdateRequestBody) => {
    const updateResponse = await coreServices.http.put<MarkdownUpdateResponseBody>(
      buildPath(`${MARKDOWN_API_PATH}/{id}`, { id }),
      {
        version: MARKDOWN_API_VERSION,
        body: JSON.stringify(markdownState),
      }
    );
    return updateResponse;
  },
};
