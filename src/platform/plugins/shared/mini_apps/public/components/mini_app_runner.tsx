/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useParams } from 'react-router-dom';
import {
  createScriptPanelBridge,
  createEsqlExecutor,
  createPanelCapabilities,
  type ScriptPanelBridge,
  type PanelSize,
  type LogEntry,
  type RuntimeState,
} from '@kbn/script-panel/public';
import type { MiniApp } from '../../common';
import { useMiniAppsContext } from '../context';
import { useMiniAppBrowserTools } from '../hooks/use_browser_tools';

const iframeContainerCss = css({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  flex: 1,
  minHeight: '400px',
});

const loadingContainerCss = css({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
});

/**
 * MiniAppRunner - Executes mini-app code in a sandboxed iframe.
 * Reuses the script panel runtime infrastructure from @kbn/script-panel.
 */
export const MiniAppRunner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { apiClient, history, coreStart, depsStart } = useMiniAppsContext();
  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>('idle');
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<ScriptPanelBridge | null>(null);
  const panelSizeRef = useRef<PanelSize>({ width: 0, height: 0 });

  // Load the mini-app data
  useEffect(() => {
    const loadMiniApp = async () => {
      try {
        setLoading(true);
        setRuntimeError(null);
        const app = await apiClient.get(id);
        setMiniApp(app);
      } catch (error) {
        coreStart.notifications.toasts.addError(error as Error, {
          title: i18n.translate('miniApps.runner.loadError', {
            defaultMessage: 'Failed to load mini app',
          }),
        });
        history.push('/');
      } finally {
        setLoading(false);
      }
    };
    loadMiniApp();
  }, [id, apiClient, coreStart.notifications.toasts, history]);

  // Get panel (container) size callback
  const getPanelSize = useCallback((): PanelSize => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      panelSizeRef.current = { width: rect.width, height: rect.height };
    }
    return panelSizeRef.current;
  }, []);

  // Set content callback (for render.setContent capability)
  const setContent = useCallback((_html: string) => {
    // The iframe handles its own rendering, this is just for tracking
  }, []);

  // Set error callback (for render.setError capability)
  const setError = useCallback((message: string) => {
    setRuntimeError(new Error(message));
  }, []);

  // Handle logs from the sandbox
  const handleLog = useCallback((_entry: LogEntry) => {
    // Logs are already printed to console in capabilities.ts
  }, []);

  // Handle runtime state changes
  const handleStateChange = useCallback((state: RuntimeState) => {
    setRuntimeState(state);
  }, []);

  // Handle bridge errors
  const handleError = useCallback((err: Error) => {
    setRuntimeError(err);
  }, []);

  // Callback to update the mini-app code (used by browser tools and for reloading)
  const updateCode = useCallback(
    async (newCode: string) => {
      if (!miniApp) return;

      try {
        const updatedApp = await apiClient.update(miniApp.id, {
          name: miniApp.name,
          script_code: newCode,
        });
        setMiniApp(updatedApp);
        // Bridge will be reloaded due to scriptCode change in effect below
      } catch (error) {
        coreStart.notifications.toasts.addError(error as Error, {
          title: i18n.translate('miniApps.runner.updateError', {
            defaultMessage: 'Failed to update mini app',
          }),
        });
      }
    },
    [miniApp, apiClient, coreStart.notifications.toasts]
  );

  // Register browser tools for AI agent editing
  useMiniAppBrowserTools({
    miniApp,
    onUpdateCode: updateCode,
  });

  // Effect to manage bridge lifecycle
  useEffect(() => {
    if (!containerRef.current || !miniApp?.script_code) {
      // Clean up existing bridge if script code is cleared
      if (bridgeRef.current) {
        bridgeRef.current.destroy();
        bridgeRef.current = null;
      }
      return;
    }

    // Clear any previous error
    setRuntimeError(null);

    // Create ES|QL executor (without dashboard context for standalone mini-apps)
    const esqlExecutor = createEsqlExecutor({
      deps: {
        data: depsStart.data,
        expressions: depsStart.expressions,
      },
      // Mini-apps don't have dashboard context - they use the global time filter
      getContext: () => ({
        timeRange: depsStart.data.query.timefilter.timefilter.getTime(),
      }),
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
      scriptCode: miniApp.script_code,
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
    miniApp?.script_code,
    depsStart.data,
    depsStart.expressions,
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

  const handleBack = useCallback(() => {
    history.push('/');
  }, [history]);

  const handleEdit = useCallback(() => {
    history.push(`/edit/${id}`);
  }, [history, id]);

  const handleReload = useCallback(() => {
    if (bridgeRef.current && miniApp?.script_code) {
      setRuntimeError(null);
      bridgeRef.current.reload(miniApp.script_code).catch(handleError);
    }
  }, [miniApp?.script_code, handleError]);

  // Loading state
  if (loading) {
    return (
      <EuiPageTemplate.EmptyPrompt>
        <EuiLoadingSpinner size="xl" />
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  if (!miniApp) {
    return null;
  }

  return (
    <>
      <EuiPageTemplate.Header
        pageTitle={miniApp.name}
        rightSideItems={[
          <EuiFlexGroup key="actions" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={handleBack} iconType="arrowLeft">
                <FormattedMessage id="miniApps.runner.backButton" defaultMessage="Back to list" />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleReload}
                iconType="refresh"
                isDisabled={!miniApp.script_code}
              >
                <FormattedMessage id="miniApps.runner.reloadButton" defaultMessage="Reload" />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleEdit} iconType="pencil" fill>
                <FormattedMessage id="miniApps.runner.editButton" defaultMessage="Edit" />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />
      <EuiPageTemplate.Section grow paddingSize="none">
        {runtimeError && (
          <EuiCallOut
            title={i18n.translate('miniApps.runner.runtimeError', {
              defaultMessage: 'Runtime error',
            })}
            color="danger"
            iconType="error"
            css={css({ margin: '16px' })}
          >
            <p>{runtimeError.message}</p>
          </EuiCallOut>
        )}
        {runtimeState === 'loading' && (
          <div css={loadingContainerCss}>
            <EuiLoadingSpinner size="xl" />
          </div>
        )}
        <div
          ref={containerRef}
          css={iframeContainerCss}
          data-test-subj="miniAppIframeContainer"
          style={{ display: runtimeState === 'loading' ? 'none' : 'block' }}
        />
      </EuiPageTemplate.Section>
    </>
  );
};
