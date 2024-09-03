/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  GetIn,
  CreateIn,
  SearchIn,
  UpdateIn,
  DeleteIn,
  DeleteResult,
  SearchResult,
  GetResult,
  CreateResult,
  UpdateResult,
} from '@kbn/content-management-plugin/common';
import type { ContentManagementCrudTypes } from '@kbn/content-management-utils';

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { EventAnnotationGroupContentType } from '../types';

export interface Reference {
  type: string;
  id: string;
  name: string;
}

export interface EventAnnotationGroupSavedObjectAttributes {
  title: string;
  description: string;
  ignoreGlobalFilters: boolean;
  annotations: EventAnnotationConfig[];
  // NULL is important here - undefined will not properly remove this property from the saved object
  dataViewSpec: DataViewSpec | null;
}

export interface EventAnnotationGroupSavedObject {
  id: string;
  type: string;
  version?: string;
  updatedAt?: string;
  createdAt?: string;
  attributes: EventAnnotationGroupSavedObjectAttributes;
  references: Reference[];
  namespaces?: string[];
  originId?: string;
  error?: {
    error: string;
    message: string;
    statusCode: number;
    metadata?: Record<string, unknown>;
  };
}

export type PartialEventAnnotationGroupSavedObject = Omit<
  EventAnnotationGroupSavedObject,
  'attributes' | 'references'
> & {
  attributes: Partial<EventAnnotationGroupSavedObjectAttributes>;
  references: Reference[] | undefined;
};
// ----------- GET --------------

export type EventAnnotationGroupGetIn = GetIn<EventAnnotationGroupContentType>;

export type EventAnnotationGroupGetOut = GetResult<
  EventAnnotationGroupSavedObject,
  {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
  }
>;

// ----------- CREATE --------------

export interface CreateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type EventAnnotationGroupCreateIn = CreateIn<
  EventAnnotationGroupContentType,
  EventAnnotationGroupSavedObjectAttributes,
  CreateOptions
>;

export type EventAnnotationGroupCreateOut = CreateResult<EventAnnotationGroupSavedObject>;

// ----------- UPDATE --------------

export interface UpdateOptions {
  /** Array of referenced saved objects. */
  references?: Reference[];
}

export type EventAnnotationGroupUpdateIn = UpdateIn<
  EventAnnotationGroupContentType,
  EventAnnotationGroupSavedObjectAttributes,
  UpdateOptions
>;

export type EventAnnotationGroupUpdateOut = UpdateResult<PartialEventAnnotationGroupSavedObject>;

// ----------- DELETE --------------

export type EventAnnotationGroupDeleteIn = DeleteIn<EventAnnotationGroupContentType>;

export type EventAnnotationGroupDeleteOut = DeleteResult;

// ----------- SEARCH --------------

export interface EventAnnotationGroupSearchQuery {
  types?: string[];
  searchFields?: string[];
}

export type EventAnnotationGroupSearchIn = SearchIn<
  EventAnnotationGroupContentType,
  EventAnnotationGroupSearchQuery
>;

export type EventAnnotationGroupSearchOut = SearchResult<EventAnnotationGroupSavedObject>;

// ----------- CRUD TYPES --------------

export type EventAnnotationGroupCrudTypes = ContentManagementCrudTypes<
  EventAnnotationGroupContentType,
  EventAnnotationGroupSavedObjectAttributes,
  CreateOptions,
  UpdateOptions,
  {}
>;
