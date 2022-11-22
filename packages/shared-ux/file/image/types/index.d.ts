/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Set of metadata captured for every image uploaded via the file services'
 * public components.
 */
export interface FileImageMetadata {
  /**
   * The blurhash that can be displayed while the image is loading
   */
  blurhash?: string;
  /**
   * Width, in px, of the original image
   */
  width: number;
  /**
   * Height, in px, of the original image
   */
  height: number;
}
