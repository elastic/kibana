/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public/plugin';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { createMarkdownVisFn } from './markdown_fn';
import { getMarkdownVisRenderer } from './markdown_renderer';
import { markdownVisType } from './markdown_vis';

export function setupLegacyVis(
  getStartDeps: StartServicesAccessor,
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>,
  visualizations: VisualizationsSetup
) {
  visualizations.createBaseVisualization(markdownVisType);
  expressions.registerRenderer(getMarkdownVisRenderer(getStartDeps));
  expressions.registerFunction(createMarkdownVisFn);
}
