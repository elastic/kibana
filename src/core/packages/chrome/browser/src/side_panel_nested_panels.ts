/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

/** @public */
export interface SidePanelNestedPanelRenderProps {
  onItemClick: (item: { href: string; id: string; label: string }) => void;
}

/** @public */
export type SidePanelNestedPanelRenderer = (
  props: SidePanelNestedPanelRenderProps
) => ReactNode;

/**
 * Global registry for ensuring a single renderer map across bundles loaded from different plugins.
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_SIDE_PANEL_NESTED_PANEL_RENDERERS__';

interface SidePanelNestedPanelRegistry {
  renderers: Map<string, SidePanelNestedPanelRenderer>;
  listeners: Set<() => void>;
}

const getGlobalRegistry = (): SidePanelNestedPanelRegistry => {
  if (typeof globalThis === 'undefined') {
    return {
      renderers: new Map<string, SidePanelNestedPanelRenderer>(),
      listeners: new Set(),
    };
  }

  return ((globalThis as Record<string, SidePanelNestedPanelRegistry>)[REGISTRY_KEY] ??= {
    renderers: new Map<string, SidePanelNestedPanelRenderer>(),
    listeners: new Set(),
  });
};

const notifyRegistryListeners = () => {
  getGlobalRegistry().listeners.forEach((listener) => listener());
};

/** @public */
export const registerSidePanelNestedPanelRenderer = (
  panelId: string,
  renderer: SidePanelNestedPanelRenderer
): void => {
  getGlobalRegistry().renderers.set(panelId, renderer);
  notifyRegistryListeners();
};

/** @public */
export const getSidePanelNestedPanelRenderer = (
  panelId: string
): SidePanelNestedPanelRenderer | undefined => getGlobalRegistry().renderers.get(panelId);

/** @public */
export const renderSidePanelNestedPanel = (
  panelId: string,
  props: SidePanelNestedPanelRenderProps
): ReactNode => getSidePanelNestedPanelRenderer(panelId)?.(props) ?? null;

/** @internal */
export const subscribeSidePanelNestedPanelRenderers = (listener: () => void): (() => void) => {
  const registry = getGlobalRegistry();
  registry.listeners.add(listener);

  return () => {
    registry.listeners.delete(listener);
  };
};
