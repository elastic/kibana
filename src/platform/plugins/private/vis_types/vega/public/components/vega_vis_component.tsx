/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import {
  EuiResizeObserver,
  type EuiResizeObserverProps,
  euiScrollBarStyles,
  type UseEuiTheme,
} from '@elastic/eui';

import type { IInterpreterRenderHandlers, RenderMode } from '@kbn/expressions-plugin/common';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type {
  VegaSandboxApplyFilterMessage,
  VegaSandboxErrorMessage,
  VegaSandboxMessage,
  VegaSandboxOpenHrefMessage,
  VegaSandboxSaveStateMessage,
  VegaSandboxWarnMessage,
} from '@kbn/vega-sandbox';
import { VEGA_SANDBOX_PROTOCOL_VERSION } from '@kbn/vega-sandbox';
import { createVegaVisualization } from '../vega_visualization';
import type { VegaVisualizationDependencies } from '../plugin';
import type { VegaRenderDescriptor } from '../data_model/types';
import type { VegaInspectorAdapters } from '../vega_inspector';
import { createVegaStateRestorer } from '../lib/vega_state_restorer';
import { createVegaFilterActionHandler } from '../vega_view/vega_filter_action_handler';
import { getData, getDataViews } from '../services';
import {
  createVegaSandboxFrameHost,
  type VegaSandboxFrameHost,
} from '../vega_view/vega_sandbox_frame_host';
import {
  translateVegaSandboxError,
  translateVegaSandboxWarning,
} from '../vega_view/vega_sandbox_messages';

import { GlobalVegaVisStyles } from './vega_vis.styles';

interface VegaVisComponentProps {
  deps: VegaVisualizationDependencies;
  fireEvent: IInterpreterRenderHandlers['event'];
  inspectorAdapters?: VegaInspectorAdapters;
  renderComplete: (params?: { timedOut?: boolean }) => void;
  renderMode: RenderMode;
  visData: VegaRenderDescriptor;
  useSandbox: boolean;
  sandboxFrameSrc: string;
}

type VegaVisController = InstanceType<ReturnType<typeof createVegaVisualization>>;

const vegaVisStyles = {
  wrapperStyles: (euiTheme: UseEuiTheme) => css`
    ${euiScrollBarStyles(euiTheme)}
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    overflow: auto;
    position: relative;
    min-width: 0;
    min-height: 0;
  `,
  chartStyles: () => css`
    position: relative;
    flex: 1 1 0%;
    min-width: 0;
    min-height: 0;
  `,
};

export const VegaVisComponent = ({
  visData,
  fireEvent,
  inspectorAdapters,
  renderComplete,
  deps,
  renderMode,
  useSandbox,
  sandboxFrameSrc,
}: VegaVisComponentProps) => {
  const styles = useMemoCss(vegaVisStyles);
  const chartDiv = useRef<HTMLDivElement>(null);
  const renderCompleted = useRef(false);
  const visController = useRef<VegaVisController | null>(null);
  const sandboxHost = useRef<VegaSandboxFrameHost | null>(null);
  const sandboxLoaded = useRef(false);
  const pendingSandboxMessages = useRef<VegaSandboxMessage[]>([]);
  const completionTimeoutId = useRef<number | undefined>(undefined);
  const renderSequence = useRef(0);
  const sandboxRenderInFlight = useRef(false);

  const [sandboxMessages, setSandboxMessages] = useState<
    Array<{ type: 'warn' | 'err'; text: string }>
  >([]);

  const sandboxRenderDescriptor = useMemo(
    () => ({
      spec: visData.spec,
      vlspec: visData.vlspec,
      colorSchemes: visData.colorSchemes,
      renderer: visData.renderer,
      useHover: visData.useHover,
      useResize: visData.useResize,
      tooltips: visData.tooltips,
    }),
    [visData]
  );

  const vegaStateRestorer = useMemo(
    () =>
      createVegaStateRestorer({
        isActive: () => Boolean(visData.restoreSignalValuesOnRefresh),
      }),
    [visData.restoreSignalValuesOnRefresh]
  );

  const addSandboxMessage = useCallback((type: 'warn' | 'err', text: string) => {
    setSandboxMessages((prev) => {
      if (prev.some((m) => m.type === type && m.text === text)) return prev;
      return [...prev, { type, text }];
    });
  }, []);

  const clearCompletionTimeout = useCallback(() => {
    if (completionTimeoutId.current != null) {
      window.clearTimeout(completionTimeoutId.current);
      completionTimeoutId.current = undefined;
    }
  }, []);

  const completeSandboxRender = useCallback(
    ({ timedOut }: { timedOut?: boolean } = {}) => {
      if (renderCompleted.current) return;
      renderCompleted.current = true;
      sandboxRenderInFlight.current = false;
      clearCompletionTimeout();
      renderComplete({ timedOut });
    },
    [clearCompletionTimeout, renderComplete]
  );

  const startCompletionTimeout = useCallback(
    (seq: number) => {
      clearCompletionTimeout();
      completionTimeoutId.current = window.setTimeout(() => {
        if (renderSequence.current !== seq || renderCompleted.current) return;
        completeSandboxRender({ timedOut: true });
      }, 15000);
    },
    [clearCompletionTimeout, completeSandboxRender]
  );

  const postToSandbox = useCallback((message: VegaSandboxMessage) => {
    const host = sandboxHost.current;
    if (!host) return;
    if (!sandboxLoaded.current) {
      pendingSandboxMessages.current.push(message);
      return;
    }
    host.postMessage(message);
  }, []);

  const flushPendingSandboxMessage = useCallback(() => {
    if (!sandboxLoaded.current) return;
    const host = sandboxHost.current;
    if (!host) return;
    for (const message of pendingSandboxMessages.current) {
      host.postMessage(message);
    }
    pendingSandboxMessages.current = [];
  }, []);

  const onSandboxMessage = useCallback(
    (message: VegaSandboxMessage) => {
      if (!useSandbox) return;

      switch (message.type) {
        case 'rendered': {
          if (!sandboxRenderInFlight.current) return;
          completeSandboxRender();
          return;
        }
        case 'error': {
          const { error } = message as VegaSandboxErrorMessage;
          const translated = translateVegaSandboxError(error);
          inspectorAdapters?.vega.setError(translated);
          addSandboxMessage('err', translated);
          completeSandboxRender();
          return;
        }
        case 'warn': {
          const { warning } = message as VegaSandboxWarnMessage;
          if (renderMode !== 'view' && visData.hideWarnings) return;
          addSandboxMessage('warn', translateVegaSandboxWarning(warning));
          return;
        }
        case 'applyFilter': {
          const { intent } = message as VegaSandboxApplyFilterMessage;
          const { filterManager } = getData().query;
          const onVegaFunction = createVegaFilterActionHandler({
            descriptor: visData,
            filterManager,
            fireEvent,
            getDataViews,
          });
          onVegaFunction(intent).catch((error) => {
            const msg = error instanceof Error ? error.message : String(error);
            inspectorAdapters?.vega.setError(msg);
            addSandboxMessage('err', msg);
          });
          return;
        }
        case 'saveState': {
          const { state } = message as VegaSandboxSaveStateMessage;
          if (state && typeof state === 'object' && !Array.isArray(state)) {
            vegaStateRestorer.save(state as any);
          }
          return;
        }
        case 'openHref': {
          const { href } = message as VegaSandboxOpenHrefMessage;
          const validated = deps.core.http.externalUrl.validateUrl(href);
          if (validated) {
            window.open(validated.toString(), '_blank', 'noopener,noreferrer');
          }
          return;
        }
      }
    },
    [
      addSandboxMessage,
      completeSandboxRender,
      deps.core.http.externalUrl,
      fireEvent,
      inspectorAdapters,
      renderMode,
      useSandbox,
      vegaStateRestorer,
      visData,
    ]
  );

  useEffect(() => {
    if (!chartDiv.current) return;

    if (useSandbox) {
      chartDiv.current.replaceChildren();
      setSandboxMessages([]);
      sandboxLoaded.current = false;
      pendingSandboxMessages.current = [];
      renderCompleted.current = false;
      sandboxRenderInFlight.current = false;

      const host = createVegaSandboxFrameHost({
        frameSrc: sandboxFrameSrc,
        onMessage: (message) => onSandboxMessage(message),
        parentEl: chartDiv.current,
      });
      sandboxHost.current = host;

      const onLoad = () => {
        sandboxLoaded.current = true;
        // Always init after load, then flush any pending render.
        host.postMessage({ type: 'init', protocolVersion: VEGA_SANDBOX_PROTOCOL_VERSION });
        flushPendingSandboxMessage();
      };

      host.iframe.addEventListener('load', onLoad);

      return () => {
        host.iframe.removeEventListener('load', onLoad);
        host.destroy();
        sandboxHost.current = null;
        sandboxLoaded.current = false;
        pendingSandboxMessages.current = [];
        clearCompletionTimeout();
      };
    }

    const VegaVis = createVegaVisualization(deps, renderMode);
    visController.current = new VegaVis(chartDiv.current, fireEvent);
    return () => {
      visController.current?.destroy();
      visController.current = null;
      clearCompletionTimeout();
    };
  }, [
    clearCompletionTimeout,
    deps,
    fireEvent,
    flushPendingSandboxMessage,
    onSandboxMessage,
    renderMode,
    sandboxFrameSrc,
    useSandbox,
  ]);

  useEffect(() => {
    if (useSandbox) {
      inspectorAdapters?.vega.clearError();
      inspectorAdapters?.vega.setRuntimeInspectorEnabled(false);
      inspectorAdapters?.vega.setSpec(
        visData.isVegaLite && visData.vlspec ? (visData.vlspec as any) : (visData.spec as any)
      );
      setSandboxMessages([]);

      // Parser warnings are emitted parent-side and should display even when runtime warnings are hidden.
      for (const warning of visData.warnings) {
        addSandboxMessage('warn', warning);
      }

      if (visData.error) {
        addSandboxMessage('err', visData.error);
        inspectorAdapters?.vega.setError(visData.error);
        renderCompleted.current = true;
        renderComplete();
        return;
      }

      renderCompleted.current = false;
      sandboxRenderInFlight.current = true;
      const seq = ++renderSequence.current;
      startCompletionTimeout(seq);

      postToSandbox({
        type: 'render',
        descriptor: sandboxRenderDescriptor,
      });

      const state = vegaStateRestorer.restore();
      if (state) {
        postToSandbox({ type: 'restoreState', state });
      }
      return;
    }

    const asyncRender = async (visCtrl: VegaVisController) => {
      await visCtrl.render(visData, inspectorAdapters);
      renderCompleted.current = true;
      renderComplete();
    };

    if (visController.current) {
      asyncRender(visController.current);
    }
  }, [
    addSandboxMessage,
    inspectorAdapters,
    postToSandbox,
    renderComplete,
    sandboxRenderDescriptor,
    startCompletionTimeout,
    useSandbox,
    vegaStateRestorer,
    visData,
  ]);

  const onContainerResize: EuiResizeObserverProps['onResize'] = useCallback(
    (dimensions) => {
      if (useSandbox) {
        if (sandboxRenderInFlight.current || renderCompleted.current) {
          postToSandbox({ type: 'resize', dimensions });
        }
        return;
      }

      if (renderCompleted.current) {
        visController.current?.resize(dimensions);
      }
    },
    [postToSandbox, useSandbox]
  );

  return (
    <>
      <GlobalVegaVisStyles />
      <EuiResizeObserver onResize={onContainerResize}>
        {(resizeRef) => (
          <div css={styles.wrapperStyles} ref={resizeRef}>
            {useSandbox && sandboxMessages.length > 0 ? (
              <ul className="vgaVis__messages">
                {sandboxMessages.map((m) => (
                  <li
                    key={`${m.type}:${m.text}`}
                    className={`vgaVis__message vgaVis__message--${m.type}`}
                  >
                    <pre className="vgaVis__messageCode">{m.text}</pre>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="vgaVis" css={styles.chartStyles} ref={chartDiv} />
          </div>
        )}
      </EuiResizeObserver>
    </>
  );
};
