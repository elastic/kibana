/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ReactNode } from 'react';
import { cloneDeep, isObjectLike } from 'lodash';
import { EuiBasicTableColumn } from '@elastic/eui';
import { SavedObjectsClientContract } from '@kbn/core/public';

import { defaultUserContentAttributes } from '../../common';
import { GetUserContentTableColumnsDefinitionsOptions } from '../types';
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

  /**
   * Get the table column for user generated content
   *
   * @param options Options to return the column
   * @returns EuiBasicTableColumn definition to be used in EuiMemoryTable
   */
  getUserContentTableColumnsDefinitions({
    contentType,
    selectedViewsRange,
  }: GetUserContentTableColumnsDefinitionsOptions): Array<
    EuiBasicTableColumn<Record<string, unknown>>
  > {
    if (!this.contents.has(contentType)) {
      return [];
    }
    const viewsCountColumn: EuiBasicTableColumn<Record<string, unknown>> = {
      field: selectedViewsRange,
      name: 'Views',
      render: (field: string, record: Record<string, unknown>) => (
        <span>{record[selectedViewsRange] as ReactNode}</span>
      ),
      sortable: true,
    };

    return [viewsCountColumn];
  }

  private registerSavedObjectHooks() {
    // Hook whenever user generated saved object(s) are accessed
    this.savedObjectClient?.post('get', async (objects) => {
      const registeredContents = [...this.contents.keys()];

      const filteredToContentType = objects.filter(({ type }) => registeredContents.includes(type));

      if (filteredToContentType.length > 0) {
        this.metadataEventsService?.bulkRegisterEvents(
          filteredToContentType.map(({ id: soId, type }) => ({
            type: 'viewed:kibana',
            soId,
            soType: type,
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

        // Add common attributes to all user generated saved objects
        const updatedAttributes = this.addDefaultUserContentAttributes(attributes as object);

        return { ...object, attributes: updatedAttributes };
      });

      return updatedObject;
    });
  }

  private addInitialViewCountsToAttributes(attributes: object): object {
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
      views_counters: EVENTS_COUNT_GRANULARITY.reduce((agg, days) => {
        return {
          ...agg,
          [`${days}_days`]: 0,
        };
      }, {} as ViewsCounters),
    };
  }
}
