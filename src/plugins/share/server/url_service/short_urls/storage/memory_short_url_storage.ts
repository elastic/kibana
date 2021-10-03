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
import { SavedObjectReference } from 'kibana/server';
import { ShortUrlStorage, ShortUrlRecord } from '../types';

export class MemoryShortUrlStorage implements ShortUrlStorage {
  private urls = new Map<string, ShortUrlRecord>();

  public async create<P extends SerializableRecord = SerializableRecord>(
    data: Omit<ShortUrlData<P>, 'id'>,
    { references = [] }: { references?: SavedObjectReference[] } = {}
  ): Promise<ShortUrlData<P>> {
    const id = uuidv4();
    const url: ShortUrlRecord<P> = {
      data: { ...data, id },
      references,
    };
    this.urls.set(id, url);

    return url.data;
  }

  public async getById<P extends SerializableRecord = SerializableRecord>(
    id: string
  ): Promise<ShortUrlRecord<P>> {
    if (!this.urls.has(id)) {
      throw new Error(`No short url with id "${id}"`);
    }
    return this.urls.get(id)! as ShortUrlRecord<P>;
  }

  public async getBySlug<P extends SerializableRecord = SerializableRecord>(
    slug: string
  ): Promise<ShortUrlRecord<P>> {
    for (const url of this.urls.values()) {
      if (url.data.slug === slug) {
        return url as ShortUrlRecord<P>;
      }
    }
    throw new Error(`No short url with slug "${slug}".`);
  }

  public async exists(slug: string): Promise<boolean> {
    for (const url of this.urls.values()) {
      if (url.data.slug === slug) {
        return true;
      }
    }
    return false;
  }

  public async delete(id: string): Promise<void> {
    this.urls.delete(id);
  }
}
