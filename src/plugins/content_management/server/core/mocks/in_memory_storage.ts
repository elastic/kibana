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

class InMemoryStorage implements ContentStorage {
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
        ...(await this.db.get(id)),
        options: forwardInResponse,
      };
    }
    return this.db.get(id);
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

    return ids.map((id) =>
      forwardInResponse ? { ...this.db.get(id), options: forwardInResponse } : this.db.get(id)
    );
  }

  async create(
    ctx: StorageContext,
    data: Omit<FooContent, 'id'>,
    { id: _id, errorToThrow }: { id?: string; errorToThrow?: string } = {}
  ): Promise<FooContent> {
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

    return content;
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
        ...updatedContent,
        options: forwardInResponse,
      };
    }

    return updatedContent;
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
        status: 'error',
        error: `Content do delete not found [${id}].`,
      };
    }

    this.db.delete(id);

    if (forwardInResponse) {
      // We add this so we can test that options are passed down to the storage layer
      return {
        status: 'success',
        options: forwardInResponse,
      };
    }

    return {
      status: 'success',
    };
  }

  async search(
    ctx: StorageContext,
    query: { title: string },
    { errorToThrow }: { errorToThrow?: string } = {}
  ): Promise<FooContent[]> {
    // This allows us to test that proper error events are thrown when the storage layer op fails
    if (errorToThrow) {
      throw new Error(errorToThrow);
    }

    if (query.title.length < 2) {
      return [];
    }

    const rgx = new RegExp(query.title);
    return [...this.db.values()].filter(({ title }) => {
      return title.match(rgx);
    });
  }
}

export const createMemoryStorage = () => {
  return new InMemoryStorage();
};

export const createMockedStorage = (): jest.Mocked<ContentStorage> => ({
  get: jest.fn(),
  bulkGet: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
});
