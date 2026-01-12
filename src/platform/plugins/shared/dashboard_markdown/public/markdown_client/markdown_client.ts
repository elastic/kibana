/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { DeleteResult } from '@kbn/content-management-plugin/common';
import type { Reference } from '@kbn/content-management-utils';

import type { MarkdownSearchRequestBody, MarkdownSearchResponseBody } from '../../server/api';
import {
  MARKDOWN_API_PATH,
  MARKDOWN_API_VERSION,
  MARKDOWN_EMBEDDABLE_TYPE,
} from '../../common/constants';
import type {
  MarkdownCreateResponseBody,
  MarkdownReadResponseBody,
  MarkdownState,
  MarkdownUpdateResponseBody,
} from '../../server';
import { coreServices } from '../services/kibana_services';

const CACHE_SIZE = 20; // only store a max of 20 markdown embeddables
const CACHE_TTL = 1000 * 60 * 5; // time to live = 5 minutes

const cache = new LRUCache<string, MarkdownReadResponseBody>({
  max: CACHE_SIZE,
  ttl: CACHE_TTL,
});

export const markdownClient = {
  create: async (markdownState: MarkdownState, references: Reference[]) => {
    return coreServices.http.post<MarkdownCreateResponseBody>(MARKDOWN_API_PATH, {
      version: MARKDOWN_API_VERSION,
      body: JSON.stringify({
        data: markdownState,
        references,
      }),
    });
  },
  delete: async (id: string): Promise<DeleteResult> => {
    cache.delete(id);
    return coreServices.http.delete(`${MARKDOWN_API_PATH}/${id}`, {
      version: MARKDOWN_API_VERSION,
    });
  },
  get: async (id: string): Promise<MarkdownReadResponseBody> => {
    if (cache.has(id)) {
      return cache.get(id)!;
    }

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

    if (result.meta.outcome !== 'aliasMatch') {
      /**
       * Only add the markdown to the cache if it does not require a redirect - otherwise, the meta
       * alias info gets cached and prevents the markdown contents from being updated
       */
      cache.set(id, result);
    }
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
  update: async (id: string, markdownState: MarkdownState, references: Reference[]) => {
    const updateResponse = await coreServices.http.put<MarkdownUpdateResponseBody>(
      `${MARKDOWN_API_PATH}/${id}`,
      {
        version: MARKDOWN_API_VERSION,
        body: JSON.stringify({
          data: markdownState,
          references,
        }),
      }
    );
    cache.delete(id);
    return updateResponse;
  },
  invalidateCache: async (id: string) => {
    if (cache.has(id)) {
      cache.delete(id);
    }
  },
};
