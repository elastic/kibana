/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { CommonFields, ContentStorage, InternalFields, KibanaContent } from '../core';
import { FooUniqueFields } from './types';

const generateMeta = (): InternalFields['meta'] => {
  const now = new Date().toDateString();

  return {
    updatedAt: now,
    createdAt: now,
    updatedBy: { $id: 'foo' },
    createdBy: { $id: 'foo' },
  };
};

export class FooStorage implements ContentStorage<FooUniqueFields> {
  private db: Map<string, KibanaContent<FooUniqueFields>> = new Map();

  constructor(private contentType: string) {}

  async get(
    id: string,
    options?: unknown
  ): Promise<InternalFields & FooUniqueFields & CommonFields> {
    const content = this.db.get(id);

    if (!content) {
      throw new Error(`Content [${id}] not found.`);
    }

    return content;
  }

  async create(
    fields: FooUniqueFields & CommonFields,
    options?: unknown
  ): Promise<InternalFields & FooUniqueFields & CommonFields> {
    const id = uuid.v4();

    const content: KibanaContent<FooUniqueFields> = {
      ...fields,
      id,
      type: this.contentType,
      meta: generateMeta(),
    };

    this.db.set(id, content);

    return content;
  }
}
