/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ImageConfig {
  src: ImageFileSrc | ImageUrlSrc;
  altText?: string;
  sizing: {
    objectFit: `fill` | `contain` | `cover` | `none`;
  };
  backgroundColor?: string;
}

export interface ImageFileSrc {
  type: 'file';
  fileId: string;
  fileImageMeta: {
    blurHash?: string;
    width: number;
    height: number;
  };
}

export interface ImageUrlSrc {
  type: 'url';
  url: string;
}
