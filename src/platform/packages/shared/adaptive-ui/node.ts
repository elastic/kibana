/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Server-only: PNG and SVG rendering, drawn through the two-pack Kibana
// runtime rather than either pack's own image renderer — which is what lets a
// chart node rasterize. Pulls in `satori` and native `@resvg/resvg-js`, so
// import this lazily from anything that might not rasterize.

export {
  getBundledSvgFontsDir,
  loadDefaultSvgFonts,
  renderPNG,
  renderSVG,
} from './vendor/adaptive-ui-host-kibana/node';

export type {
  PNGRenderOptions,
  PNGRenderResult,
  SVGRenderOptions,
  SVGRenderResult,
} from './vendor/adaptive-ui-host-kibana/node';
