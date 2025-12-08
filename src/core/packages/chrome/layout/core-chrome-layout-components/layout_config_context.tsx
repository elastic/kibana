/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { LayoutDimensions } from './layout.types';

/**
 * Configuration for the layout.
 * @public
 */
export type LayoutConfig = Pick<
  Partial<LayoutDimensions>,
  | 'bannerHeight'
  | 'headerHeight'
  | 'footerHeight'
  | 'navigationWidth'
  | 'sidebarWidth'
  | 'applicationTopBarHeight'
  | 'applicationBottomBarHeight'
  | 'applicationMarginRight'
  | 'applicationMarginBottom'
>;

/**
 * Context interface including both the config and an update function
 * @internal
 */
interface LayoutConfigContextValue {
  config: LayoutConfig;
  updateLayout: (updates: Partial<LayoutConfig>) => void;
}

/**
 * Global registry for ensuring single context instance across bundles
 *
 * TODO: this pattern is used to share a single context provider across bundles loaded from different plugins to allow for smoother DX
 * https://github.com/elastic/kibana/issues/240770
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_LAYOUT_CONFIG_CTX__';

interface LayoutConfigRegistry {
  LayoutConfigContext?: React.Context<LayoutConfigContextValue | undefined>;
}

const getGlobalRegistry = (): LayoutConfigRegistry => {
  if (typeof globalThis === 'undefined') {
    // Fallback for environments without globalThis
    return {};
  }
  return ((globalThis as any)[REGISTRY_KEY] ??= {} as LayoutConfigRegistry);
};

const registry = getGlobalRegistry();

// Reuse if already created, otherwise create and store
const LayoutConfigContext = (registry.LayoutConfigContext ??= createContext<
  LayoutConfigContextValue | undefined
>(undefined));

/**
 * Props for the LayoutConfigProvider component.
 * @public
 */
export interface LayoutConfigProviderProps {
  value: LayoutConfig;
  children: ReactNode;
}

/**
 * Provider of the layout config
 * @public
 */
export const LayoutConfigProvider = ({
  value: initialValue,
  children,
}: LayoutConfigProviderProps) => {
  const [config, setConfig] = useState<LayoutConfig>(initialValue);

  // Reset state when initialValue changes, but only for fields that have changed
  useEffect(() => {
    setConfig((prevConfig) => {
      const changedFields = getChangedFields(prevConfig, initialValue);

      // Only update if there are any changed fields
      if (Object.keys(changedFields).length > 0) {
        return { ...prevConfig, ...changedFields };
      }

      return prevConfig;
    });
  }, [initialValue]);

  const updateLayout = useCallback((updates: Partial<LayoutConfig>) => {
    setConfig((prevConfig) => {
      const changedFields = getChangedFields(prevConfig, updates);

      // Only update if there are any changed fields
      if (Object.keys(changedFields).length > 0) {
        return { ...prevConfig, ...changedFields };
      }

      return prevConfig;
    });
  }, []);

  return (
    <LayoutConfigContext.Provider value={{ config, updateLayout }}>
      {children}
    </LayoutConfigContext.Provider>
  );
};

/**
 * Hook to access the layout configuration.
 * @internal
 * @returns The current layout configuration
 * @throws Error if used outside of a LayoutConfigProvider
 */
export function useLayoutConfig(): LayoutConfig {
  const context = useContext(LayoutConfigContext);
  if (!context) {
    throw new Error('useLayoutConfig must be used within a LayoutConfigProvider');
  }
  return context.config;
}

/**
 * Hook to access and update the layout configuration.
 * @public
 * @returns a function to update it
 * @throws Error if used outside of a LayoutConfigProvider
 */
export function useLayoutUpdate(): (updates: Partial<LayoutConfig>) => void {
  const context = useContext(LayoutConfigContext);
  if (!context) {
    throw new Error('useLayoutConfigUpdate must be used within a LayoutConfigProvider');
  }
  return context.updateLayout;
}

/**
 * Utility function to extract only changed fields between two objects
 * @internal
 */
function getChangedFields<T extends Record<string, unknown>>(
  current: T,
  updates: Partial<T>
): Partial<T> {
  return Object.entries(updates).reduce<Partial<T>>((acc, [key, value]) => {
    const typedKey = key as keyof T;
    if (current[typedKey] !== value) {
      acc[typedKey] = value;
    }
    return acc;
  }, {});
}
