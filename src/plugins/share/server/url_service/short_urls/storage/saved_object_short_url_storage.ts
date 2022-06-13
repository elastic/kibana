/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { SavedObject, SavedObjectReference, SavedObjectsClientContract } from 'kibana/server';
import { ShortUrlRecord } from '..';
import { UrlServiceError } from '../..';
import { LEGACY_SHORT_URL_LOCATOR_ID } from '../../../../common/url_service/locators/legacy_short_url_locator';
import { ShortUrlData } from '../../../../common/url_service/short_urls/types';
import { ShortUrlStorage } from '../types';
import { escapeSearchReservedChars } from '../util';

export type ShortUrlSavedObject = SavedObject<ShortUrlSavedObjectAttributes>;

/**
 * Fields that stored in the short url saved object.
 */
export interface ShortUrlSavedObjectAttributes {
  /**
   * The slug of the short URL, the part after the `/` in the URL.
   */
  readonly slug?: string;

  /**
   * Number of times the short URL has been resolved.
   */
  readonly accessCount: number;

  /**
   * The timestamp of the last time the short URL was resolved.
   */
  readonly accessDate: number;

  /**
   * The timestamp when the short URL was created.
   */
  readonly createDate: number;

  /**
   * Serialized locator state.
   */
  readonly locatorJSON: string;

  /**
   * Legacy field - was used in old short URL versions. This field will
   * be removed in the future by a migration.
   *
   * @deprecated
   */
  readonly url: string;
}

const createShortUrlData = <P extends SerializableRecord = SerializableRecord>(
  savedObject: ShortUrlSavedObject
): ShortUrlData<P> => {
  const attributes = savedObject.attributes;

  if (!!attributes.url) {
    const { url, ...rest } = attributes;
    const state = { url } as unknown as P;

    return {
      id: savedObject.id,
      slug: savedObject.id,
      locator: {
        id: LEGACY_SHORT_URL_LOCATOR_ID,
        version: '7.15.0',
        state,
      },
      ...rest,
    } as ShortUrlData<P>;
  }

  const { locatorJSON, ...rest } = attributes;
  const locator = JSON.parse(locatorJSON) as ShortUrlData<P>['locator'];

  return {
    id: savedObject.id,
    locator,
    ...rest,
  } as ShortUrlData<P>;
};

const createAttributes = <P extends SerializableRecord = SerializableRecord>(
  data: Partial<Omit<ShortUrlData<P>, 'id'>>
): ShortUrlSavedObjectAttributes => {
  const { accessCount = 0, accessDate = 0, createDate = 0, slug = '', locator } = data;
  const attributes: ShortUrlSavedObjectAttributes = {
    accessCount,
    accessDate,
    createDate,
    slug,
    locatorJSON: locator ? JSON.stringify(locator) : '',
    url: '',
  };

  return attributes;
};

export interface SavedObjectShortUrlStorageDependencies {
  savedObjectType: string;
  savedObjects: SavedObjectsClientContract;
}

export class SavedObjectShortUrlStorage implements ShortUrlStorage {
  constructor(private readonly dependencies: SavedObjectShortUrlStorageDependencies) {}

  public async create<P extends SerializableRecord = SerializableRecord>(
    data: Omit<ShortUrlData<P>, 'id'>,
    { references }: { references?: SavedObjectReference[] } = {}
  ): Promise<ShortUrlData<P>> {
    const { savedObjects, savedObjectType } = this.dependencies;
    const attributes = createAttributes(data);

    const savedObject = await savedObjects.create(savedObjectType, attributes, {
      refresh: true,
      references,
    });

    return createShortUrlData<P>(savedObject);
  }

  public async update<P extends SerializableRecord = SerializableRecord>(
    id: string,
    data: Partial<Omit<ShortUrlData<P>, 'id'>>,
    { references }: { references?: SavedObjectReference[] } = {}
  ): Promise<void> {
    const { savedObjects, savedObjectType } = this.dependencies;
    const attributes = createAttributes(data);

    await savedObjects.update(savedObjectType, id, attributes, {
      refresh: true,
      references,
    });
  }

  public async getById<P extends SerializableRecord = SerializableRecord>(
    id: string
  ): Promise<ShortUrlRecord<P>> {
    const { savedObjects, savedObjectType } = this.dependencies;
    const savedObject = await savedObjects.get<ShortUrlSavedObjectAttributes>(savedObjectType, id);

    return {
      data: createShortUrlData<P>(savedObject),
      references: savedObject.references,
    };
  }

  public async getBySlug<P extends SerializableRecord = SerializableRecord>(
    slug: string
  ): Promise<ShortUrlRecord<P>> {
    const { savedObjects } = this.dependencies;
    const search = `(attributes.slug:"${escapeSearchReservedChars(slug)}")`;
    const result = await savedObjects.find({
      type: this.dependencies.savedObjectType,
      search,
    });

    if (result.saved_objects.length !== 1) {
      throw new UrlServiceError('not found', 'NOT_FOUND');
    }

    const savedObject = result.saved_objects[0] as ShortUrlSavedObject;

    return {
      data: createShortUrlData<P>(savedObject),
      references: savedObject.references,
    };
  }

  public async exists(slug: string): Promise<boolean> {
    const { savedObjects } = this.dependencies;
    const search = `(attributes.slug:"${escapeSearchReservedChars(slug)}")`;
    const result = await savedObjects.find({
      type: this.dependencies.savedObjectType,
      search,
    });

    return result.saved_objects.length > 0;
  }

  public async delete(id: string): Promise<void> {
    const { savedObjects, savedObjectType } = this.dependencies;
    await savedObjects.delete(savedObjectType, id);
  }
}
