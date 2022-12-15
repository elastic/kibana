/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Represents a single content item as it is stored in the registry.
 */
export interface CmItem<Content = unknown> {
  /**
   * Global ID of the content item. Consists of a 2-part ID separated by a
   * colon, for example: `<my-type>:<my-id>`.
   */
  id: string;

  /**
   * Well known common fields of this content item.
   */
  fields: CmItemFields;

  /**
   * The actual full contents of this item. Usually treated as a black box,
   * but can be used to store any data that is relevant to the content item.
   */
  content: Content;
}

/**
 * Well known common fields for content items.
 */
export interface CmItemFields {
  title?: string;
  description?: string;
  color?: string;
}
