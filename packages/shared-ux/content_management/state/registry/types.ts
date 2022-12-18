/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
   * CRUD + Search operations that can be performed on content items of this
   * type.
   */
  operations: ContentTypeOperations<T>;
}

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
  list?: () => Promise<ContentItemDetails<T>[]>;
}

/**
 * Content item data as it is returned by the network layer.
 */
export interface ContentItemDetails<T = unknown> {
  /**
   * ID of the content item, not including the type prefix.
   */
  id: string;

  /**
   * Well known common fields of this content item.
   */
  fields: ContentItemFields;

  /**
   * The actual full contents of this item. Usually treated as a black box,
   * but can be used to store any data that is relevant to the content item.
   */
  content: T;
}

/**
 * Well known common fields for content items.
 */
export interface ContentItemFields {
  /**
   * Human-readable title of the content item or a user name, if item is a user.
   */
  title?: string;

  /**
   * Human-readable description of the content item.
   */
  description?: string;

  /**
   * HEX color code to use for this content item. If not specified, will be
   * computed based on the item's ID.
   */
  color?: string;
}
