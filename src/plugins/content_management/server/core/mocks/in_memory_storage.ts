/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentStorage, StorageContext } from '../types';

export interface FooContent {
  id: string;
  title: string;
}

let idx = 0;

class InMemoryStorage implements ContentStorage<any> {
  private db: Map<string, FooContent> = new Map();

  async get(
    ctx: StorageContext,
    id: string,
    { forwardInResponse, errorToThrow }: { forwardInResponse?: object; errorToThrow?: string } = {}
  ) {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    if (forwardInResponse) {
      // We add this so we can test that options are passed down to the storage layer
      return {
        item: {
          ...(await this.db.get(id)),
          options: forwardInResponse,
        },
      };
    }
    return {
      item: this.db.get(id),
    };
  }

  async bulkGet(
    ctx: StorageContext,
    ids: string[],
    { forwardInResponse, errorToThrow }: { forwardInResponse?: object; errorToThrow?: string } = {}
  ) {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    return {
      hits: ids.map((id) =>
        forwardInResponse
          ? { item: { ...this.db.get(id), options: forwardInResponse } }
          : { item: this.db.get(id) }
      ),
    };
  }

  async create(
    ctx: StorageContext,
    data: Omit<FooContent, 'id'>,
    {
      id: _id,
      forwardInResponse,
      errorToThrow,
    }: { id?: string; errorToThrow?: string; forwardInResponse?: object } = {}
  ) {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    const nextId = idx++;
    const id = _id ?? nextId.toString();

    const content: FooContent = {
      ...data,
      id,
    };

    this.db.set(id, content);

    if (forwardInResponse) {
      // We add this so we can test that options are passed down to the storage layer
      return {
        item: {
          ...content,
          options: forwardInResponse,
        },
      };
    }

    return {
      item: content,
    };
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: Partial<Omit<FooContent, 'id'>>,
    { forwardInResponse, errorToThrow }: { forwardInResponse?: object; errorToThrow?: string } = {}
  ) {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    const content = this.db.get(id);
    if (!content) {
      throw new Error(`Content to update not found [${id}].`);
    }

    const updatedContent = {
      ...content,
      ...data,
    };

    this.db.set(id, updatedContent);

    if (forwardInResponse) {
      // We add this so we can test that options are passed down to the storage layer
      return {
        item: {
          ...updatedContent,
          options: forwardInResponse,
        },
      };
    }

    return {
      item: updatedContent,
    };
  }

  async delete(
    ctx: StorageContext,
    id: string,
    { forwardInResponse, errorToThrow }: { forwardInResponse?: object; errorToThrow?: string } = {}
  ) {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    if (!this.db.has(id)) {
      return {
        success: false,
        error: `Content do delete not found [${id}].`,
      };
    }

    this.db.delete(id);

    if (forwardInResponse) {
      // We add this so we can test that options are passed down to the storage layer
      return {
        success: true,
        options: forwardInResponse,
      };
    }

    return {
      success: true,
    };
  }

  async search(
    ctx: StorageContext,
    query: { text: string },
    { errorToThrow, forwardInResponse }: { errorToThrow?: string; forwardInResponse?: object } = {}
  ) {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    if (query.text.length < 2) {
      return {
        hits: [],
        pagination: {
          total: 0,
          cursor: '',
        },
      };
    }

    const rgx = new RegExp(query.text);
    const hits = [...this.db.values()].filter(({ title }) => {
      return title.match(rgx);
    });
    return {
      hits: forwardInResponse ? hits.map((hit) => ({ ...hit, options: forwardInResponse })) : hits,
      pagination: {
        total: hits.length,
        cursor: '',
      },
    };
  }
}

export const createMemoryStorage = (): ContentStorage<FooContent> => {
  return new InMemoryStorage() as ContentStorage<FooContent>;
};

export const createMockedStorage = (): jest.Mocked<ContentStorage> => ({
  get: jest.fn(),
  bulkGet: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
});
