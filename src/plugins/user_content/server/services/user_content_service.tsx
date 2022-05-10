/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { cloneDeep, isObjectLike } from 'lodash';
import {
  Logger,
  SavedObjectsServiceSetup,
  SavedObjectsType,
  SavedObjectsTypeMappingDefinition,
} from '@kbn/core/server';

import { defaultUserContentAttributes, userContentCommonMappings } from '../../common';
import { MetadataEventsService } from './metadata_events_service';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContent {}

export interface ContentConfig {
  soType: SavedObjectsType;
}

interface Dependencies {
  metadataEventService: MetadataEventsService;
  savedObjects: SavedObjectsServiceSetup;
}

export class UserContentService {
  private logger: Logger;
  private contents: Map<string, UserContent>;
  private savedObjects: SavedObjectsServiceSetup | undefined;
  private metadataEventsService: MetadataEventsService | undefined;

  constructor({ logger }: { logger: Logger }) {
    this.contents = new Map<string, UserContent>();
    this.logger = logger;
  }

  init({ metadataEventService, savedObjects }: Dependencies) {
    this.savedObjects = savedObjects;
    this.metadataEventsService = metadataEventService;

    this.registerSavedObjectsHooks();
  }

  /**
   * Register a new "User generated content". It corresponds to a saved object "type" which
   * adds common functionalities to those object (like adding a "Views count" each time a SO is accessed).
   * @param contentType The Saved object "type" that correspond to a user generated content
   * @param content Optionally an object to configure the user content
   */
  registerContent({ soType }: ContentConfig, content: UserContent = {}): void {
    if (!this.savedObjects) {
      throw new Error(`Can't register content. [savedObjects] dependency missing.`);
    }
    if (this.contents.has(soType.name)) {
      throw new Error(`User content type [${soType.name}] is already registered`);
    }

    validateMappings(soType.name, soType.mappings);
    const updatedMappings = mergeUserContentCommonMappings(soType.mappings);

    this.contents.set(soType.name, content);
    this.savedObjects.registerType({ ...soType, mappings: updatedMappings });

    this.logger.debug(`New user generated content [${soType.name}] registerd.`);
  }

  public get userContentTypes() {
    return [...this.contents.keys()];
  }

  private registerSavedObjectsHooks() {
    // Hook whenever user generated saved object(s) are accessed
    this.savedObjects!.post('get', async (objects) => {
      const registeredContents = this.userContentTypes;
      const filteredToContentType = objects.filter(({ type }) => registeredContents.includes(type));

      if (filteredToContentType.length > 0) {
        this.metadataEventsService?.bulkRegisterEvents(
          filteredToContentType.map(({ id: soId, type }) => ({
            type: 'viewed:kibana',
            data: {
              so_id: soId,
              so_type: type,
            },
          }))
        );
      }
    });

    // Hook before saving a user generated saved object
    this.savedObjects!.pre('create', async (objects) => {
      if (!objects) {
        return;
      }
      const updatedObject = objects.map((object) => {
        const { type, attributes } = object;
        if (!this.contents.has(type)) {
          return object;
        }
        // Add common attributes to all user generated saved objects
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
        // Already declared, we don't override it
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

/**
 * Validate that the provided mappings don't collide with the user generated
 * common mappings.
 *
 * @param soType The saved object type to register
 * @param mappings The saved object mappings to register
 */
const validateMappings = (soType: string, mappings: SavedObjectsTypeMappingDefinition) => {
  Object.keys(mappings.properties).forEach((key) => {
    if (userContentCommonMappings.hasOwnProperty(key)) {
      throw new Error(`Mapping definition [${key}] for saved object type [${soType}] is reserved`);
    }
  });
};

/**
 * Merge common mappings for user generated content.
 *
 * @param mappings The saved object mappings to register
 * @returns The updated mappings with the common mappings for all user generated content
 */
const mergeUserContentCommonMappings = (
  mappings: SavedObjectsTypeMappingDefinition
): SavedObjectsTypeMappingDefinition => {
  return {
    ...mappings,
    properties: {
      ...mappings.properties,
      ...userContentCommonMappings,
    },
  };
};
