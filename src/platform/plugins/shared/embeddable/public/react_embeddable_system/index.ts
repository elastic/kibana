/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { PanelIncompatibleError } from './panel_incompatible_error';
export { PanelNotFoundError } from './panel_not_found_error';
export { registerEmbeddablePublicDefinition } from './react_embeddable_registry';

/**
 * Kicks off the embeddable renderer async chunk (buildEmbeddable, PresentationPanel,
 * PhaseTracker). Call this at application module load time —
 * so the chunk loads in parallel with application chunk loading.
 */
export const prefetchEmbeddableRenderer = (): void => {
  import('../async_module');
};
export { EmbeddableRenderer } from './react_embeddable_renderer';
export { EmbeddableRendererContext } from './embeddable_renderer_context';
export type { QuickActionIds } from './embeddable_renderer_context';
export { PlacementStrategy } from './constants';
export type { DefaultEmbeddableApi, EmbeddablePublicDefinition, LayoutConstraints } from './types';
