/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClient } from 'kibana/server';
import { SerializableState } from 'src/plugins/kibana_utils/common';
import { ShortUrlData } from 'src/plugins/share/common/url_service/short_urls/types';
import { ShortUrlStorage } from '../types';

export type ShortUrlSavedObject = SavedObject<ShortUrlSavedObjectAttributes>;

/**
 * Fields that stored in the short url saved object.
 */
export interface ShortUrlSavedObjectAttributes {
  /**
   * The slug of the short URL, the part after the `/` in the URL.
   */
  readonly slug: string;

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
   * be removed in a future by a migration.
   *
   * @deprecated
   */
  readonly url: string;
}

const createShortUrlData = <P extends SerializableState = SerializableState>(
  savedObject: ShortUrlSavedObject
): ShortUrlData<P> => {
  const attributes = savedObject.attributes;
  const { locatorJSON, ...rest } = attributes;
  const locator = JSON.parse(locatorJSON) as ShortUrlData<P>['locator'];

  return {
    id: savedObject.id,
    ...rest,
    locator,
  };
};

const createAttributes = <P extends SerializableState = SerializableState>(
  data: Omit<ShortUrlData<P>, 'id'>
): ShortUrlSavedObjectAttributes => {
  const { locator, ...rest } = data;
  const attributes: ShortUrlSavedObjectAttributes = {
    ...rest,
    locatorJSON: JSON.stringify(locator),
  };

  return attributes;
};

export interface SavedObjectShortUrlStorageDependencies {
  savedObjectType: string;
  savedObjects: SavedObjectsClient;
}

export class SavedObjectShortUrlStorage implements ShortUrlStorage {
  constructor(private readonly dependencies: SavedObjectShortUrlStorageDependencies) {}

  public async create<P extends SerializableState = SerializableState>(
    data: Omit<ShortUrlData<P>, 'id'>
  ): Promise<ShortUrlData<P>> {
    const { savedObjects, savedObjectType } = this.dependencies;
    const attributes = createAttributes(data);
    const savedObject = await savedObjects.create(savedObjectType, attributes);

    return createShortUrlData<P>(savedObject);
  }

  public async getById<P extends SerializableState = SerializableState>(
    id: string
  ): Promise<ShortUrlData<P>> {
    const { savedObjects, savedObjectType } = this.dependencies;
    const savedObject = await savedObjects.get<ShortUrlSavedObjectAttributes>(savedObjectType, id);

    return createShortUrlData<P>(savedObject);
  }

  public async getBySlug<P extends SerializableState = SerializableState>(
    slug: string
  ): Promise<ShortUrlData<P>> {
    const { savedObjects } = this.dependencies;
    const result = await savedObjects.find({
      type: this.dependencies.savedObjectType,
      search: `slug:${slug}`,
    });

    if (result.saved_objects.length !== 1) {
      throw new Error('not found');
    }

    const savedObject = result.saved_objects[0] as ShortUrlSavedObject;

    return createShortUrlData<P>(savedObject);
  }

  public async delete(id: string): Promise<void> {
    const { savedObjects, savedObjectType } = this.dependencies;
    await savedObjects.delete(savedObjectType, id);
  }
}
