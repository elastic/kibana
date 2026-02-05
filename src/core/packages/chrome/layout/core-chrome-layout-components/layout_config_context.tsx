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
import type { ChromeStyle } from './layout.types';
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
  | 'applicationMarginBottom'
  | 'applicationMarginRight'
> & {
  chromeStyle?: ChromeStyle;
};

/** Update function type for layout config */
type LayoutUpdateFn = (updates: Partial<LayoutConfig>) => void;

/**
 * Global registry for ensuring single context instance across bundles
 *
 * TODO: this pattern is used to share a single context provider across bundles loaded from different plugins to allow for smoother DX
 * https://github.com/elastic/kibana/issues/240770
 * @internal
 */
const REGISTRY_KEY = '__KIBANA_LAYOUT_CONFIG_CTX__';

interface LayoutConfigRegistry {
  LayoutConfigContext?: React.Context<LayoutConfig | undefined>;
  LayoutUpdateContext?: React.Context<LayoutUpdateFn | undefined>;
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
// Split into two contexts to prevent re-renders when only using updateLayout
const LayoutConfigContext = (registry.LayoutConfigContext ??= createContext<
  LayoutConfig | undefined
>(undefined));

const LayoutUpdateContext = (registry.LayoutUpdateContext ??= createContext<
  LayoutUpdateFn | undefined
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
  // Base config from props
  const [baseConfig, setBaseConfig] = useState<LayoutConfig>(initialValue);

  // Programmatic overrides from updateLayout()
  const [overrides, setOverrides] = useState<Partial<LayoutConfig>>({});

  // Update base config when props change
  useEffect(() => {
    setBaseConfig((prev) => {
      // Only update changed fields
      const changes = getChangedFields(prev, initialValue);
      if (Object.keys(changes).length === 0) return prev;

      // Clear overrides for fields that changed in props (props take precedence)
      setOverrides((prevOverrides) => {
        const newOverrides = { ...prevOverrides };
        Object.keys(changes).forEach((key) => {
          delete newOverrides[key as keyof LayoutConfig];
        });
        return newOverrides;
      });

      return { ...prev, ...changes };
    });
  }, [initialValue]);

  const updateLayout = useCallback((updates: Partial<LayoutConfig>) => {
    setOverrides((prev) => {
      const changes = getChangedFields(prev, updates);
      if (Object.keys(changes).length === 0) return prev;
      return { ...prev, ...changes };
    });
  }, []);

  // Merge base and overrides to create final config
  const config = { ...baseConfig, ...overrides };

  return (
    <LayoutUpdateContext.Provider value={updateLayout}>
      <LayoutConfigContext.Provider value={config}>{children}</LayoutConfigContext.Provider>
    </LayoutUpdateContext.Provider>
  );
};

/**
 * Hook to access the layout configuration.
 * @internal
 * @returns The current layout configuration
 * @throws Error if used outside of a LayoutConfigProvider
 */
export function useLayoutConfig(): LayoutConfig {
  const config = useContext(LayoutConfigContext);
  if (config === undefined) {
    throw new Error('useLayoutConfig must be used within a LayoutConfigProvider');
  }
  return config;
}

/**
 * Hook to get the layout update function. Does not cause re-renders when config changes.
 * @public
 * @returns a function to update the layout config
 * @throws Error if used outside of a LayoutConfigProvider
 */
export function useLayoutUpdate(): LayoutUpdateFn {
  const updateLayout = useContext(LayoutUpdateContext);
  if (updateLayout === undefined) {
    throw new Error('useLayoutUpdate must be used within a LayoutConfigProvider');
  }
  return updateLayout;
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
