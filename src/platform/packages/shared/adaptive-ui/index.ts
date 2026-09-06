/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Isomorphic surface of the vendored `@elastic/adaptive-ui-host-kibana` build:
// validation, the four non-React renderers, the view registry, and the spec
// types. Free of React and EUI, so a Kibana server plugin can import it.
//
// React components live in `@kbn/adaptive-ui/react`, spec builders in
// `@kbn/adaptive-ui/builders`, syntax grammars in `@kbn/adaptive-ui/syntax`,
// and PNG/SVG rendering in `@kbn/adaptive-ui/node`. Run
// `scripts/sync_dist.mjs` to re-vendor.

export {
  buildAuthoringPrompt,
  createViewRegistry,
  defineTheme,
  defineView,
  getAuthoringContext,
  getViewSpecSchema,
  htmlOptionsForTheme,
  parseViewSpec,
  registerView,
  renderHTML,
  renderMarkdown,
  renderSlack,
  renderText,
  validateView,
} from './vendor/adaptive-ui-host-kibana';

export type {
  AdaptiveThemeDefinition,
  AuthoringContext,
  AuthoringProfileId,
  BodyNode,
  HTMLRenderOptions,
  HTMLRenderResult,
  MarkdownRenderOptions,
  ParsedViewSpec,
  PrimitiveNode,
  SlackBlock,
  SlackRenderOptions,
  SlackRenderResult,
  SvgRenderOptions,
  TextRenderOptions,
  Tone,
  ValidationResult,
  ViewRegistry,
  ViewSpec,
} from './vendor/adaptive-ui-host-kibana';
