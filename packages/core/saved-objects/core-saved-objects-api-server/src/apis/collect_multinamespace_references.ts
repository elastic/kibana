/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsBaseOptions } from './base';

/**
 * An object to collect references for. It must be a multi-namespace type (in other words, the object type must be registered with the
 * `namespaceType: 'multiple'` or `namespaceType: 'multiple-isolated'` option).
 *
 * Note: if options.purpose is 'updateObjectsSpaces', it must be a shareable type (in other words, the object type must be registered with
 * the `namespaceType: 'multiple'`).
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesObject {
  /** The ID of the object to collect references for */
  id: string;
  /** The type of the object to collect references for */
  type: string;
}

/**
 * Purpose for collecting references.
 */
export type SavedObjectsCollectMultiNamespaceReferencesPurpose =
  | 'collectMultiNamespaceReferences'
  | 'updateObjectsSpaces';

/**
 * Options for collecting references.
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesOptions
  extends SavedObjectsBaseOptions {
  /** Optional purpose used to determine filtering and authorization checks; default is 'collectMultiNamespaceReferences' */
  purpose?: SavedObjectsCollectMultiNamespaceReferencesPurpose;
}

/**
 * A returned input object or one of its references, with additional context.
 *
 * @public
 */
export interface SavedObjectReferenceWithContext {
  /** The type of the referenced object */
  type: string;
  /** The ID of the referenced object */
  id: string;
  /** The origin ID of the referenced object (if it has one) */
  originId?: string;
  /** The space(s) that the referenced object exists in */
  spaces: string[];
  /**
   * References to this object; note that this does not contain _all inbound references everywhere for this object_, it only contains
   * inbound references for the scope of this operation
   */
  inboundReferences: Array<{
    /** The type of the object that has the inbound reference */
    type: string;
    /** The ID of the object that has the inbound reference */
    id: string;
    /** The name of the inbound reference */
    name: string;
  }>;
  /** Whether or not this object or reference is missing */
  isMissing?: boolean;
  /** The space(s) that legacy URL aliases matching this type/id exist in */
  spacesWithMatchingAliases?: string[];
  /** The space(s) that objects matching this origin exist in (including this one) */
  spacesWithMatchingOrigins?: string[];
}

/**
 * The response when object references are collected.
 *
 * @public
 */
export interface SavedObjectsCollectMultiNamespaceReferencesResponse {
  /** array of {@link SavedObjectReferenceWithContext} */
  objects: SavedObjectReferenceWithContext[];
}
