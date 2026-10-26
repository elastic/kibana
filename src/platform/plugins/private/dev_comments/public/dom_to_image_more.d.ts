/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** `dom-to-image-more` ships without type declarations; only what this plugin uses is declared. */
declare module 'dom-to-image-more' {
  namespace domtoimage {
    interface Options {
      bgcolor?: string;
      /** Size of the output in CSS pixels; the root node is given this size and anything beyond is clipped. */
      width?: number;
      height?: number;
      /** Styles applied to the root node of the clone, after everything else. */
      style?: Partial<CSSStyleDeclaration>;
      /** Return false to leave a node (and its subtree) out of the capture. Not called for the root. */
      filter?: (node: Node) => boolean;
      /**
       * Called for each cloned node, once before its children are cloned and once after
       * (`after`), before its computed styles are copied onto it. Inline styles set here win.
       */
      adjustClonedNode?: (original: Node, clone: Node, after: boolean) => void;
      /** Called with the finished clone, styles copied and field values put in, before it is drawn. */
      onclone?: (clone: Element) => void | Promise<void>;
    }

    function toCanvas(node: Node, options?: Options): Promise<HTMLCanvasElement>;
  }

  export = domtoimage;
}
