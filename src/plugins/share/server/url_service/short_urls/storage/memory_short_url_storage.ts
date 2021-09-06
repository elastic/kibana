/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SerializableRecord } from '@kbn/utility-types';
import { ShortUrlData } from 'src/plugins/share/common/url_service/short_urls/types';
import { ShortUrlStorage } from '../types';

export class MemoryShortUrlStorage implements ShortUrlStorage {
  private urls = new Map<string, ShortUrlData>();

  public async create<P extends SerializableRecord = SerializableRecord>(
    data: Omit<ShortUrlData<P>, 'id'>
  ): Promise<ShortUrlData<P>> {
    const id = uuidv4();
    const url: ShortUrlData<P> = { ...data, id };
    this.urls.set(id, url);
    return url;
  }

  public async getById<P extends SerializableRecord = SerializableRecord>(
    id: string
  ): Promise<ShortUrlData<P>> {
    if (!this.urls.has(id)) {
      throw new Error(`No short url with id "${id}"`);
    }
    return this.urls.get(id)! as ShortUrlData<P>;
  }

  public async getBySlug<P extends SerializableRecord = SerializableRecord>(
    slug: string
  ): Promise<ShortUrlData<P>> {
    for (const url of this.urls.values()) {
      if (url.slug === slug) {
        return url as ShortUrlData<P>;
      }
    }
    throw new Error(`No short url with slug "${slug}".`);
  }

  public async delete(id: string): Promise<void> {
    this.urls.delete(id);
  }
}
