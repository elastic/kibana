/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare module 'dom-to-image-more' {
  interface DomToImageOptions {
    width?: number;
    height?: number;
    bgcolor?: string;
    filter?: (node: HTMLElement) => boolean;
    onclone?: (clone: HTMLElement) => void;
  }

  const domtoimage: {
    toPng: (node: HTMLElement, options?: DomToImageOptions) => Promise<string>;
  };
  export = domtoimage;
}
