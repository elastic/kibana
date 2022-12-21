/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentItemDetails } from './content_items';

/**
 * Content type definition as it is registered in the content registry.
 */
export interface ContentTypeDetails<T = unknown> {
  /**
   * ID of the type. Must be unique. Like "dashboard", "visualization", etc.
   */
  id: string;

  /**
   * Human-readable name of the type. Like "Dashboard", "Visualization", etc.
   */
  name?: string;

  /**
   * Human-readable description of the type.
   */
  description?: string;

  /**
   * Icon to use for this type. Usually an EUI icon type.
   *
   * @see https://elastic.github.io/eui/#/display/icons
   */
  icon?: string;

  /**
   * Specifies item type. Defaults to 'other'.
   */
  kind?: ContentTypeKind;

  /**
   * CRUD + Search operations that can be performed on content items of this
   * type.
   */
  operations: ContentTypeOperations<T>;
}

/**
 * Specifies whether this type represents user-like items (like user profiles)
 * or something else (like dashboards). Defaults to 'other'.
 */
export type ContentTypeKind = 'user' | 'other';

/**
 * CRUD + Search operations that can be performed on content items of this
 * type.
 */
export interface ContentTypeOperations<T = unknown> {
  /**
   * Read a single content item by its ID.
   */
  read?: (id: string) => Promise<ContentItemDetails<T>>;

  /**
   * Read a list of content items.
   */
  list?: () => Promise<Array<ContentItemDetails<T>>>;
}
