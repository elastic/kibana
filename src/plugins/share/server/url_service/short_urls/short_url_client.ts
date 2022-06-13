/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { SavedObjectReference } from 'kibana/server';
import { generateSlug } from 'random-word-slugs';
import { ShortUrlRecord } from '.';
import type {
  IShortUrlClient,
  ShortUrl,
  ShortUrlCreateParams,
  ILocatorClient,
  ShortUrlData,
  LocatorData,
} from '../../../common/url_service';
import { UrlServiceError } from '../error';
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

  /**
   * The locators service.
   */
  locators: ILocatorClient;
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

    if (slug) {
      const isSlugTaken = await storage.exists(slug);
      if (isSlugTaken) {
        throw new UrlServiceError(`Slug "${slug}" already exists.`, 'SLUG_EXISTS');
      }
    }

    const extracted = this.extractReferences({
      id: locator.id,
      version: currentVersion,
      state: params,
    });
    const now = Date.now();

    const data = await storage.create<P>(
      {
        accessCount: 0,
        accessDate: now,
        createDate: now,
        slug,
        locator: extracted.state as LocatorData<P>,
      },
      { references: extracted.references }
    );

    return {
      data,
    };
  }

  private extractReferences(locatorData: LocatorData): {
    state: LocatorData;
    references: SavedObjectReference[];
  } {
    const { locators } = this.dependencies;
    const { state, references } = locators.extract(locatorData);
    return {
      state,
      references: references.map((ref) => ({
        ...ref,
        name: 'locator:' + ref.name,
      })),
    };
  }

  private injectReferences({ data, references }: ShortUrlRecord): ShortUrlData {
    const { locators } = this.dependencies;
    const locatorReferences = references
      .filter((ref) => ref.name.startsWith('locator:'))
      .map((ref) => ({
        ...ref,
        name: ref.name.substr('locator:'.length),
      }));
    return {
      ...data,
      locator: locators.inject(data.locator, locatorReferences),
    };
  }

  public async get(id: string): Promise<ShortUrl> {
    const { storage } = this.dependencies;
    const record = await storage.getById(id);
    const data = this.injectReferences(record);

    return {
      data,
    };
  }

  public async resolve(slug: string): Promise<ShortUrl> {
    const { storage } = this.dependencies;
    const record = await storage.getBySlug(slug);
    const data = this.injectReferences(record);

    return {
      data,
    };
  }

  public async delete(id: string): Promise<void> {
    const { storage } = this.dependencies;
    await storage.delete(id);
  }
}
