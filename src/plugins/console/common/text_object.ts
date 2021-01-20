/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const textObjectTypeName = 'text-object';

/**
 * Describes the shape of persisted objects that contain information about the current text in the
 * text editor.
 */
export interface TextObject {
  /**
   * An ID that uniquely identifies this object.
   */
  id: string;

  /**
   * UNIX timestamp of when the object was created.
   */
  createdAt: number;

  /**
   * UNIX timestamp of when the object was last updated.
   */
  updatedAt: number;

  /**
   * Text value input by the user.
   *
   * Used to re-populate a text editor buffer.
   */
  text: string;
}
