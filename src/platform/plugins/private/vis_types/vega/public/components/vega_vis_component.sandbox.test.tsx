/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { VegaRenderDescriptor } from '../data_model/types';
import { VegaVisComponent } from './vega_vis_component';

let lastOnMessage: ((message: any) => void) | undefined;
let lastHost: { iframe: HTMLIFrameElement; postMessage: jest.Mock; destroy: jest.Mock } | undefined;

jest.mock('../vega_view/vega_sandbox_frame_host', () => {
  return {
    createVegaSandboxFrameHost: jest.fn(({ onMessage }: { onMessage: (m: any) => void }) => {
      lastOnMessage = onMessage;
      const loadListeners = new Set<() => void>();
      const iframe = {
        addEventListener: (type: string, cb: () => void) => {
          if (type === 'load') loadListeners.add(cb);
        },
        removeEventListener: (type: string, cb: () => void) => {
          if (type === 'load') loadListeners.delete(cb);
        },
        dispatchLoad: () => {
          for (const cb of loadListeners) cb();
        },
      } as any;
      const host = {
        iframe,
        postMessage: jest.fn(),
        destroy: jest.fn(),
      };
      lastHost = host;
      return host;
    }),
  };
});

const createDescriptor = (): VegaRenderDescriptor =>
  ({
    spec: {},
    isVegaLite: false,
    renderer: 'canvas',
    useResize: true,
    useHover: false,
    useMap: false,
    tooltips: false,
    containerDir: 'column',
    controlsDir: 'column',
    restoreSignalValuesOnRefresh: true,
    hideWarnings: false,
    warnings: [],
    bypassExternalUrlCheckUrls: [],
  } as any);

const createInspectorAdapters = () =>
  ({
    vega: {
      clearError: jest.fn(),
      setError: jest.fn(),
      setRuntimeInspectorEnabled: jest.fn(),
      setSpec: jest.fn(),
    },
  } as any);

const createDeps = () =>
  ({
    core: {
      http: {
        externalUrl: {
          validateUrl: jest.fn().mockImplementation((href: string) => new URL(href)),
        },
      },
    },
  } as any);

describe('VegaVisComponent sandbox protocol', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    lastOnMessage = undefined;
    lastHost = undefined;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('invokes renderComplete with timedOut=true when rendered never arrives', () => {
    const renderComplete = jest.fn();

    const { unmount } = render(
      <VegaVisComponent
        deps={createDeps()}
        fireEvent={jest.fn()}
        inspectorAdapters={createInspectorAdapters()}
        renderComplete={renderComplete}
        renderMode="view"
        visData={createDescriptor()}
        useSandbox
        sandboxFrameSrc="/internal/vis_type_vega/sandbox"
      />
    );

    expect(lastHost).toBeDefined();
    (lastHost!.iframe as any).dispatchLoad();

    jest.advanceTimersByTime(15000);
    expect(renderComplete).toHaveBeenCalledWith({ timedOut: true });
    unmount();
  });

  it('invokes renderComplete exactly once when rendered arrives, ignoring duplicates', () => {
    const renderComplete = jest.fn();

    const { unmount } = render(
      <VegaVisComponent
        deps={createDeps()}
        fireEvent={jest.fn()}
        inspectorAdapters={createInspectorAdapters()}
        renderComplete={renderComplete}
        renderMode="view"
        visData={createDescriptor()}
        useSandbox
        sandboxFrameSrc="/internal/vis_type_vega/sandbox"
      />
    );

    (lastHost!.iframe as any).dispatchLoad();

    lastOnMessage!({ type: 'rendered' });
    lastOnMessage!({ type: 'rendered' });

    expect(renderComplete).toHaveBeenCalledTimes(1);
    expect(renderComplete).toHaveBeenCalledWith({});
    unmount();
  });
});
