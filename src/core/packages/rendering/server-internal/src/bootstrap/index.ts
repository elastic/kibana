/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { registerBootstrapRoute } from './register_bootstrap_route';
export { bootstrapRendererFactory, isRspackModeEnabled, isMFModeEnabled } from './bootstrap_renderer';
export { getRspackDependencyPaths } from './get_js_dependency_paths';

// Module Federation exports (legacy)
export { mfBootstrapRendererFactory } from './bootstrap_renderer_mf';
export type { MFBootstrapRenderer, MFBootstrapRendererFactory } from './bootstrap_renderer_mf';
export { getMFDependencyPaths } from './get_mf_dependency_paths';
export type { MFDependencyPaths } from './get_mf_dependency_paths';
export { renderMFTemplate } from './render_mf_template';
export type { MFBootstrapTemplateData } from './render_mf_template';
