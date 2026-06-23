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
export type SideNavItemActionMenuContext = Record<string, string>;

/** @public */
export interface SideNavItemActionMenuRenderProps {
  context: SideNavItemActionMenuContext;
  onClose: () => void;
}

/** @public */
export type SideNavItemActionMenuRenderer = (
  props: SideNavItemActionMenuRenderProps
) => ReactNode;

/**
 * Global registry for ensuring a single renderer map across bundles loaded from different plugins.
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_SIDE_NAV_ITEM_ACTION_MENU_RENDERERS__';

interface SideNavItemActionMenuRegistry {
  renderers: Map<string, SideNavItemActionMenuRenderer>;
  listeners: Set<() => void>;
}

const getGlobalRegistry = (): SideNavItemActionMenuRegistry => {
  if (typeof globalThis === 'undefined') {
    return {
      renderers: new Map<string, SideNavItemActionMenuRenderer>(),
      listeners: new Set(),
    };
  }

  return ((globalThis as Record<string, SideNavItemActionMenuRegistry>)[REGISTRY_KEY] ??= {
    renderers: new Map<string, SideNavItemActionMenuRenderer>(),
    listeners: new Set(),
  });
};

const notifyRegistryListeners = () => {
  getGlobalRegistry().listeners.forEach((listener) => listener());
};

/** @public */
export const registerSideNavItemActionMenuRenderer = (
  menuId: string,
  renderer: SideNavItemActionMenuRenderer
): void => {
  getGlobalRegistry().renderers.set(menuId, renderer);
  notifyRegistryListeners();
};

/** @public */
export const getSideNavItemActionMenuRenderer = (
  menuId: string
): SideNavItemActionMenuRenderer | undefined => getGlobalRegistry().renderers.get(menuId);

/** @public */
export const renderSideNavItemActionMenu = (
  menuId: string,
  props: SideNavItemActionMenuRenderProps
): ReactNode => getSideNavItemActionMenuRenderer(menuId)?.(props) ?? null;

/** @internal */
export const subscribeSideNavItemActionMenuRenderers = (listener: () => void): (() => void) => {
  const registry = getGlobalRegistry();
  registry.listeners.add(listener);

  return () => {
    registry.listeners.delete(listener);
  };
};
