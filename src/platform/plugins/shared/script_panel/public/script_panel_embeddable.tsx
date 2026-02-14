/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import type { StateComparators, WithAllKeys } from '@kbn/presentation-publishing';
import {
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
  fetch$,
} from '@kbn/presentation-publishing';
import React, { useEffect, useRef, useCallback } from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import type { ScriptPanelCodeState, ScriptPanelSerializedState } from '../server';
import { SCRIPT_PANEL_EMBEDDABLE_TYPE } from '../common/constants';
import type { ScriptPanelApi } from './types';
import type { ScriptPanelServices } from './plugin';
import { createScriptPanelBrowserTools } from './browser_tools';
import { createScriptPanelBridge, createEsqlExecutor, createPanelCapabilities } from './runtime';
import type {
  ScriptPanelBridge,
  LogEntry,
  RuntimeState,
  DashboardContext,
  PanelSize,
} from './runtime';

const defaultScriptState: WithAllKeys<ScriptPanelCodeState> = {
  script_code: '',
};

const flexCss = css({
  display: 'flex',
  flex: '1 1 100%',
  alignItems: 'center',
  justifyContent: 'center',
});

const iframeContainerCss = css({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const scriptComparators: StateComparators<ScriptPanelCodeState> = {
  script_code: 'referenceEquality',
};

/**
 * Factory function that creates the script panel embeddable with injected services.
 */
export const getScriptPanelEmbeddableFactory = (
  services: ScriptPanelServices
): EmbeddableFactory<ScriptPanelSerializedState, ScriptPanelApi> => {
  return {
    type: SCRIPT_PANEL_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const titleManager = initializeTitleManager(initialState);
      const scriptStateManager = initializeStateManager(initialState, defaultScriptState);
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const runtimeState$ = new BehaviorSubject<RuntimeState>('idle');

      const serializeState = () => ({
        ...titleManager.getLatestState(),
        ...scriptStateManager.getLatestState(),
      });

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          scriptStateManager.anyStateChange$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return { ...titleComparators, ...scriptComparators };
        },
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved);
          scriptStateManager.reinitializeState(lastSaved);
        },
      });

      // Create browser tools for agent-based editing
      const browserTools = createScriptPanelBrowserTools({
        getCode: () => scriptStateManager.api.scriptCode$.getValue() ?? '',
        setCode: (code: string) => {
          scriptStateManager.api.setScriptCode(code);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...titleManager.api,
        dataLoading$,
        blockingError$,
        serializeState,
        onEdit: async () => {
          // Editing is handled via agent browser tools
          // This could open the agent flyout focused on this panel in the future
        },
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('scriptPanel.displayName', {
            defaultMessage: 'Script',
          }),
        getBrowserTools: () => browserTools,
      });

      // Subscribe to fetch context for dashboard context
      let currentContext: DashboardContext = {};
      const fetchSubscription = fetch$(api).subscribe((fetchContext) => {
        const { timeRange } = fetchContext;
        currentContext = {
          timeRange: timeRange
            ? {
                from: timeRange.from,
                to: timeRange.to,
              }
            : undefined,
          query: fetchContext.query as DashboardContext['query'],
          filters: fetchContext.filters as DashboardContext['filters'],
        };
      });

      return {
        api,
        Component: function ScriptPanelEmbeddableComponent() {
          const [scriptCode, error] = useBatchedPublishingSubjects(
            scriptStateManager.api.scriptCode$,
            blockingError$
          );

          const containerRef = useRef<HTMLDivElement>(null);
          const bridgeRef = useRef<ScriptPanelBridge | null>(null);
          const renderedContentRef = useRef<string>('');
          const panelSizeRef = useRef<PanelSize>({ width: 0, height: 0 });

          // Get panel size callback
          const getPanelSize = useCallback((): PanelSize => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              panelSizeRef.current = { width: rect.width, height: rect.height };
            }
            return panelSizeRef.current;
          }, []);

          // Set content callback (for render.setContent capability)
          const setContent = useCallback((html: string) => {
            renderedContentRef.current = html;
            // The iframe handles its own rendering, this is just for tracking
          }, []);

          // Set error callback (for render.setError capability)
          const setError = useCallback((message: string) => {
            blockingError$.next(new Error(message));
          }, []);

          // Handle logs from the sandbox
          const handleLog = useCallback((entry: LogEntry) => {
            // Logs are already printed to console in capabilities.ts
            // Could expose these through the API for external consumption
          }, []);

          // Handle runtime state changes
          const handleStateChange = useCallback((state: RuntimeState) => {
            runtimeState$.next(state);
            dataLoading$.next(state === 'loading');
          }, []);

          // Handle bridge errors
          const handleError = useCallback((err: Error) => {
            blockingError$.next(err);
          }, []);

          // Effect to manage bridge lifecycle
          useEffect(() => {
            if (!containerRef.current || !scriptCode) {
              // Clean up existing bridge if script code is cleared
              if (bridgeRef.current) {
                bridgeRef.current.destroy();
                bridgeRef.current = null;
              }
              return;
            }

            // Clear any previous error
            blockingError$.next(undefined);

            // Create ES|QL executor with context getter
            const esqlExecutor = createEsqlExecutor({
              deps: services,
              getContext: () => currentContext,
            });

            // Create capabilities
            const capabilities = createPanelCapabilities({
              esqlExecutor,
              getPanelSize,
              setContent,
              setError,
              onLog: handleLog,
            });

            // Create and start the bridge
            const bridge = createScriptPanelBridge({
              container: containerRef.current,
              scriptCode,
              handlers: capabilities.handlers,
              onStateChange: handleStateChange,
              onLog: handleLog,
              onError: handleError,
            });

            bridgeRef.current = bridge;
            bridge.start().catch(handleError);

            // Cleanup on unmount or when script changes
            return () => {
              bridge.destroy();
              capabilities.destroy();
              bridgeRef.current = null;
            };
          }, [
            scriptCode,
            getPanelSize,
            setContent,
            setError,
            handleLog,
            handleStateChange,
            handleError,
          ]);

          // Effect to handle resize events
          useEffect(() => {
            if (!containerRef.current) return;

            const resizeObserver = new ResizeObserver(() => {
              const size = getPanelSize();
              if (bridgeRef.current) {
                bridgeRef.current.sendEvent('resize', size);
              }
            });

            resizeObserver.observe(containerRef.current);

            return () => {
              resizeObserver.disconnect();
            };
          }, [getPanelSize]);

          // Cleanup fetch subscription on unmount
          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);

          // In error case return null - panel will render the blocking error
          if (error) return null;

          // If no script code, show empty state
          if (!scriptCode) {
            return (
              <div css={flexCss} data-shared-item data-rendering-count={1}>
                <EuiEmptyPrompt
                  iconType="editorCodeBlock"
                  title={
                    <h3>
                      {i18n.translate('scriptPanel.emptyState.title', {
                        defaultMessage: 'Script panel',
                      })}
                    </h3>
                  }
                  body={
                    <EuiText size="s">
                      <p>
                        {i18n.translate('scriptPanel.emptyState.description', {
                          defaultMessage:
                            'This panel executes custom JavaScript code in a sandboxed environment.',
                        })}
                      </p>
                      <p>
                        {i18n.translate('scriptPanel.emptyState.hint', {
                          defaultMessage:
                            'Use the AI assistant to generate code, or provide a script through the panel configuration.',
                        })}
                      </p>
                    </EuiText>
                  }
                />
              </div>
            );
          }

          // Render the iframe container
          return (
            <div
              ref={containerRef}
              css={iframeContainerCss}
              data-shared-item
              data-rendering-count={1}
              data-test-subj="scriptPanelIframeContainer"
            />
          );
        },
      };
    },
  };
};
