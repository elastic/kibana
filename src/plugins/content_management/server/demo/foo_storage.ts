/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import moment from 'moment';

import { ContentStorage } from '../core';
import type { FooContent } from './types';

const getTimestamp = () => moment().toISOString();

const generateMeta = (): FooContent['meta'] => {
  const now = getTimestamp();

  return {
    updatedAt: now,
    createdAt: now,
    updatedBy: { $id: 'foo' },
    createdBy: { $id: 'foo' },
  };
};

export class FooStorage implements ContentStorage {
  private db: Map<string, FooContent> = new Map();
  private contentType = 'foo' as const;

  async get(id: string, options?: unknown): Promise<FooContent> {
    const content = this.db.get(id);

    if (!content) {
      throw new Error(`Content [${id}] not found.`);
    }

    return content;
  }

  async create(fields: Pick<FooContent, 'title' | 'description' | 'foo'>): Promise<FooContent> {
    const id = uuid.v4();

    const content: FooContent = {
      ...fields,
      id,
      type: this.contentType,
      meta: generateMeta(),
    };

    this.db.set(id, content);

    return content;
  }
}
