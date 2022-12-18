/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Serializable content item data as it is returned by the network layer, e.g.
 * from the RPC endpoint call to the server.
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
 * Well known common fields for all content items.
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

/**
 * Represents a single content item as it is presented to users of this library.
 * Libraries that build on top of the content management service will receive
 * content items of this type.
 */
export interface CmItem {
  /**
   * ID of the content item, without the type prefix.
   */
  getId(): string;

  /**
   * Human-readable title of the content item.
   */
  getTitle(): string;
}
