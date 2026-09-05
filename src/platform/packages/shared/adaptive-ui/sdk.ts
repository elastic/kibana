/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Pack-authoring toolkit. A host-private pack imports from here, never from
// `@kbn/adaptive-ui/compose`. Kibana cannot reuse upstream's eslint pack
// boundary, so the split is by subpath.

export {
  definePrimitive,
  definePrimitivePack,
  extendPrimitivePack,
} from './vendor/adaptive-ui-sdk/entries';

export type {
  AnyPrimitiveDefinition,
  PrimitiveCatalogEntry,
  PrimitiveDefinition,
  PrimitiveNode,
  PrimitivePack,
  PrimitivePackInput,
} from './vendor/adaptive-ui-sdk/entries';

export { createStyleModule, registerProfileContribution } from './vendor/adaptive-ui-theme-tokens';

export type {
  StyleHandle,
  SvgRenderTheme,
  ThemeTokenPath,
} from './vendor/adaptive-ui-theme-tokens';

export { StylesCollector } from './vendor/distillate';
