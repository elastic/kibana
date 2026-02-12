/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  LayoutConfigProvider,
  useLayoutConfig,
  useLayoutUpdate,
  type LayoutConfig,
} from './layout_config_context';

describe('LayoutConfigContext', () => {
  const defaultConfig: LayoutConfig = {
    headerHeight: 48,
    navigationWidth: 240,
    sidebarWidth: 300,
  };

  it('updateLayout overrides base config values', () => {
    const { result } = renderHook(
      () => ({
        config: useLayoutConfig(),
        updateLayout: useLayoutUpdate(),
      }),
      {
        wrapper: ({ children }) => (
          <LayoutConfigProvider value={defaultConfig}>{children}</LayoutConfigProvider>
        ),
      }
    );

    // Set first override
    act(() => {
      result.current.updateLayout({ sidebarWidth: 400 });
    });

    expect(result.current.config.sidebarWidth).toBe(400);
    expect(result.current.config.headerHeight).toBe(48);

    // Set another override - both should be applied
    act(() => {
      result.current.updateLayout({ headerHeight: 64 });
    });

    expect(result.current.config.sidebarWidth).toBe(400);
    expect(result.current.config.headerHeight).toBe(64);
    expect(result.current.config.navigationWidth).toBe(240);
  });

  it('props changes clear overrides for changed fields only', () => {
    let config = defaultConfig;

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <LayoutConfigProvider value={config}>{children}</LayoutConfigProvider>
    );

    const { result, rerender } = renderHook(
      () => ({
        config: useLayoutConfig(),
        updateLayout: useLayoutUpdate(),
      }),
      { wrapper: Wrapper }
    );

    // Set overrides for sidebarWidth and headerHeight
    act(() => {
      result.current.updateLayout({ sidebarWidth: 500, headerHeight: 80 });
    });

    expect(result.current.config.sidebarWidth).toBe(500);
    expect(result.current.config.headerHeight).toBe(80);

    // Change only navigationWidth prop - should NOT clear other overrides
    config = { ...defaultConfig, navigationWidth: 300 };
    rerender();

    expect(result.current.config.sidebarWidth).toBe(500);
    expect(result.current.config.headerHeight).toBe(80);
    expect(result.current.config.navigationWidth).toBe(300);
  });

  it('props take precedence over overrides', () => {
    let config = defaultConfig;

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <LayoutConfigProvider value={config}>{children}</LayoutConfigProvider>
    );

    const { result, rerender } = renderHook(
      () => ({
        config: useLayoutConfig(),
        updateLayout: useLayoutUpdate(),
      }),
      { wrapper: Wrapper }
    );

    // Set override for sidebarWidth
    act(() => {
      result.current.updateLayout({ sidebarWidth: 500 });
    });

    expect(result.current.config.sidebarWidth).toBe(500);

    // Change sidebarWidth prop - prop value should win
    config = { ...defaultConfig, sidebarWidth: 350 };
    rerender();

    expect(result.current.config.sidebarWidth).toBe(350);
  });

  it('useLayoutUpdate consumers do not re-render when config changes', () => {
    let configRenderCount = 0;
    let updateRenderCount = 0;

    // Track renders for a component using only useLayoutUpdate
    const UpdateOnlyConsumer = ({ onRender }: { onRender: () => void }) => {
      const updateLayout = useLayoutUpdate();
      onRender();
      return <button onClick={() => updateLayout({ sidebarWidth: 500 })}>Update</button>;
    };

    // Track renders for a component using useLayoutConfig
    const ConfigConsumer = ({ onRender }: { onRender: () => void }) => {
      const config = useLayoutConfig();
      onRender();
      return <div data-testid="config">{config.sidebarWidth}</div>;
    };

    const { result } = renderHook(
      () => {
        const updateLayout = useLayoutUpdate();
        return { updateLayout };
      },
      {
        wrapper: ({ children }) => (
          <LayoutConfigProvider value={defaultConfig}>
            <UpdateOnlyConsumer onRender={() => updateRenderCount++} />
            <ConfigConsumer onRender={() => configRenderCount++} />
            {children}
          </LayoutConfigProvider>
        ),
      }
    );

    // Initial render
    expect(configRenderCount).toBe(1);
    expect(updateRenderCount).toBe(1);

    // Update config - should cause config consumer to re-render
    act(() => {
      result.current.updateLayout({ sidebarWidth: 400 });
    });

    // Config consumer should re-render
    expect(configRenderCount).toBe(2);
    // Update-only consumer should NOT re-render
    expect(updateRenderCount).toBe(1);
  });
});
