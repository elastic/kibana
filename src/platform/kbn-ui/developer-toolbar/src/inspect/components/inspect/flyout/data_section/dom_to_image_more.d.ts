/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** `dom-to-image-more` ships without type declarations; only what this package uses is declared. */
declare module 'dom-to-image-more' {
  namespace domtoimage {
    function toCanvas(node: Node): Promise<HTMLCanvasElement>;
  }

  export = domtoimage;
}
