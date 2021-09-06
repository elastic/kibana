/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { ShortUrlData } from '../../../common/url_service/short_urls/types';

/**
 * Interface used for persisting short URLs.
 */
export interface ShortUrlStorage {
  /**
   * Create and store a new short URL entry.
   */
  create<P extends SerializableRecord = SerializableRecord>(
    data: Omit<ShortUrlData<P>, 'id'>
  ): Promise<ShortUrlData<P>>;

  /**
   * Fetch a short URL entry by ID.
   */
  getById<P extends SerializableRecord = SerializableRecord>(id: string): Promise<ShortUrlData<P>>;

  /**
   * Fetch a short URL entry by slug.
   */
  getBySlug<P extends SerializableRecord = SerializableRecord>(
    slug: string
  ): Promise<ShortUrlData<P>>;

  /**
   * Delete an existing short URL entry.
   *
   * @returns True if the short URL was deleted, false otherwise.
   */
  delete(id: string): Promise<void>;
}
