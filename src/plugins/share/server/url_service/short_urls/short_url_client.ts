/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { generateSlug } from 'random-word-slugs';
import type { IShortUrlClient, ShortUrl, ShortUrlCreateParams } from '../../../common/url_service';
import type { ShortUrlStorage } from './types';
import { validateSlug } from './util';

const defaultAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomStr(length: number, alphabet = defaultAlphabet) {
  let str = '';
  const alphabetLength = alphabet.length;
  for (let i = 0; i < length; i++) {
    str += alphabet.charAt(Math.floor(Math.random() * alphabetLength));
  }
  return str;
}

/**
 * Dependencies of the Short URL Client.
 */
export interface ServerShortUrlClientDependencies {
  /**
   * Current version of Kibana, e.g. 7.15.0.
   */
  currentVersion: string;

  /**
   * Storage provider for short URLs.
   */
  storage: ShortUrlStorage;
}

export class ServerShortUrlClient implements IShortUrlClient {
  constructor(private readonly dependencies: ServerShortUrlClientDependencies) {}

  public async create<P extends SerializableRecord>({
    locator,
    params,
    slug = '',
    humanReadableSlug = false,
  }: ShortUrlCreateParams<P>): Promise<ShortUrl<P>> {
    if (slug) {
      validateSlug(slug);
    }

    if (!slug) {
      slug = humanReadableSlug ? generateSlug() : randomStr(4);
    }

    const { storage, currentVersion } = this.dependencies;
    const now = Date.now();
    const data = await storage.create({
      accessCount: 0,
      accessDate: now,
      createDate: now,
      slug,
      locator: {
        id: locator.id,
        version: currentVersion,
        state: params,
      },
    });

    return {
      data,
    };
  }

  public async get(id: string): Promise<ShortUrl> {
    const { storage } = this.dependencies;
    const data = await storage.getById(id);

    return {
      data,
    };
  }

  public async delete(id: string): Promise<void> {
    const { storage } = this.dependencies;
    await storage.delete(id);
  }

  public async resolve(slug: string): Promise<ShortUrl> {
    const { storage } = this.dependencies;
    const data = await storage.getBySlug(slug);

    return {
      data,
    };
  }
}
