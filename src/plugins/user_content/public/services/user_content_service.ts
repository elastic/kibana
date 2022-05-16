/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { cloneDeep, isObjectLike } from 'lodash';
import { SavedObjectsClientContract } from '@kbn/core/public';

import { defaultUserContentAttributes } from '../../common';
import { MetadataEventsService } from './metadata_events_service';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContent {}

interface Dependencies {
  metadataEventService: MetadataEventsService;
  savedObjectClient: SavedObjectsClientContract;
}

export class UserContentService {
  private contents: Map<string, UserContent>;
  private savedObjectClient: SavedObjectsClientContract | undefined;
  private metadataEventsService: MetadataEventsService | undefined;

  constructor() {
    this.contents = new Map<string, UserContent>();
  }

  init({ metadataEventService, savedObjectClient }: Dependencies) {
    this.savedObjectClient = savedObjectClient;
    this.metadataEventsService = metadataEventService;

    this.registerSavedObjectHooks();
  }

  /**
   * Register a new "User generated content". It corresponds to a saved object "type" which
   * adds common functionalities to those object (like adding a "Views count" each time a SO is accessed).
   * @param contentType The Saved object "type" that correspond to a user generated content
   * @param content Optionally an object to configure the user content
   */
  register(contentType: string, content: UserContent = {}): void {
    if (this.contents.has(contentType)) {
      throw new Error(`User content type [${contentType}] is already registered`);
    }

    this.contents.set(contentType, content);
  }

  private registerSavedObjectHooks() {
    // Hook whenever user generated saved object(s) are accessed
    this.savedObjectClient?.post('get', async (objects) => {
      const registeredContents = [...this.contents.keys()];

      const filteredToContentType: Array<{ id: string }> = objects.filter(({ type }) =>
        registeredContents.includes(type)
      );

      if (filteredToContentType.length > 0) {
        this.metadataEventsService?.bulkRegisterEvents(
          filteredToContentType.map(({ id: soId }) => ({
            type: 'viewed:kibana',
            soId,
          }))
        );
      }
    });

    // Hook before saving a user generated saved object
    this.savedObjectClient?.pre('create', async (objects) => {
      if (!objects) {
        return;
      }

      const updatedObject = objects.map((object) => {
        const { type, attributes } = object;

        if (!this.contents.has(type)) {
          return object;
        }

        const updatedAttributes = this.addDefaultUserContentAttributes(attributes as object);

        return { ...object, attributes: updatedAttributes };
      });

      return updatedObject;
    });
  }

  /**
   * Merge user content common default attributes to the provided attibutes.
   * This does **override** existing attributes.
   *
   * @param attributes Saved object attributes to be saved
   * @returns The attributes provided + the common user content attributes
   */
  private addDefaultUserContentAttributes(attributes: object): object {
    if (typeof attributes !== 'object' || attributes === null || Array.isArray(attributes)) {
      return attributes;
    }

    const userContentAttributes: { [key: string]: unknown } = { ...attributes };

    Object.entries(defaultUserContentAttributes).forEach(([attr, value]) => {
      if (attributes.hasOwnProperty(attr)) {
        // Already declared, we don't want to override it
        return;
      }

      userContentAttributes[attr] = isObjectLike(value) ? cloneDeep(value) : value;
    });

    // Initiate the views counters
    return {
      ...attributes,
      ...userContentAttributes,
    };
  }
}
