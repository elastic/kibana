/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EventStream } from '../event_streams';
import {
  SavedObjectsClient,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsCreateOptions,
  SavedObjectsBulkResponse,
} from '.';

import { SavedObject, SavedObjectsBaseOptions } from '../types';

export type SavedObjectEventsTypes = 'pre:get' | 'post:get' | 'pre:create' | 'post:create';

interface BaseSavedObjectEvents {
  type: SavedObjectEventsTypes;
}

export interface PreGetEvent extends BaseSavedObjectEvents {
  type: 'pre:get';
  data: {
    objects?: SavedObjectsBulkGetObject[];
    options?: SavedObjectsBaseOptions;
  };
}

export interface PostGetEvent<T = unknown> extends BaseSavedObjectEvents {
  type: 'post:get';
  data: {
    objects: Array<SavedObject<T>>;
    options: Parameters<SavedObjectsClient['bulkGet']>[1];
  };
}

export interface PreCreateEvent<T = unknown> extends BaseSavedObjectEvents {
  type: 'pre:create';
  data: {
    objects: Array<SavedObjectsBulkCreateObject<T>>;
    options?: SavedObjectsCreateOptions;
  };
}

export interface PostCreateEvent extends BaseSavedObjectEvents {
  type: 'post:create';
  data: {
    objects: SavedObjectsBulkResponse['saved_objects'];
  };
}

export type SavedObjectEvents = PreGetEvent | PostGetEvent | PreCreateEvent | PostCreateEvent;

export type SavedObjectEventStream = EventStream<SavedObjectEvents>;
