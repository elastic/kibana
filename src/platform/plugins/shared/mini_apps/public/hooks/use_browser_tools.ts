/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useMemo } from 'react';
import { z } from '@kbn/zod';
import type { RuntimeState, LogEntry } from '@kbn/script-panel/public';
import type { MiniApp } from '../../common';

/**
 * Browser tool definition shape - minimal type for browser-side tools.
 * This mirrors the shape expected by agent builder but avoids the x-pack dependency.
 */
export interface MiniAppBrowserToolDefinition<TParams = unknown> {
  id: string;
  description: string;
  schema: z.ZodType<TParams>;
  handler: (params: TParams) => void | Promise<void>;
}

const emptySchema = z.object({});
const codeSchema = z.object({
  code: z.string().describe('The complete JavaScript code for the mini app.'),
});

type EmptyParams = z.infer<typeof emptySchema>;
type CodeParams = z.infer<typeof codeSchema>;

/**
 * Tracks the current screen state of a running mini app for agent context.
 */
export interface MiniAppScreenState {
  /** Last HTML set via Kibana.render.setContent() */
  renderedHtml: string;
  /** Current runtime state */
  runtimeState: RuntimeState;
  /** Most recent error, if any */
  runtimeError: string | null;
  /** Recent log entries from the mini app */
  recentLogs: LogEntry[];
  /** Current panel size */
  panelSize: { width: number; height: number };
}

const UPDATE_CODE_DESCRIPTION = `Replace the mini app's JavaScript code. The app instantly reloads with the new code.

RULES:
- Provide the COMPLETE code. This replaces everything.
- Plain vanilla JavaScript only. NO React, NO JSX, NO imports.
- Wrap in an async IIFE: (async () => { ... })();
- Data: Kibana.esql.query({ query }) for Elasticsearch data. fetch/XHR is blocked.
- Rendering: Kibana.render.setContent(html) sets initial HTML, then use full DOM APIs (getElementById, addEventListener, createElement, Canvas 2D/WebGL, SVG, requestAnimationFrame, setInterval) for interactivity and animation.
- CSS: inline <style> tags only.`;

interface CreateMiniAppBrowserToolsOptions {
  getCode: () => string;
  setCode: (code: string) => void;
  getScreenState: () => MiniAppScreenState;
}

/**
 * Creates browser API tools for AI agent interaction with mini apps.
 * These tools are registered with both the window registry (for backwards
 * compatibility) and returned directly for use with the agent builder flyout.
 */
export const createMiniAppBrowserTools = ({
  getCode,
  setCode,
  getScreenState,
}: CreateMiniAppBrowserToolsOptions): Array<
  MiniAppBrowserToolDefinition<EmptyParams> | MiniAppBrowserToolDefinition<CodeParams>
> => {
  const getContextTool: MiniAppBrowserToolDefinition<EmptyParams> = {
    id: 'mini_app_get_context',
    description:
      'Get the current mini app context: source code, rendered HTML output, runtime state, errors, and recent logs. Use this to understand what the mini app currently does before making changes.',
    schema: emptySchema,
    handler: () => {
      const code = getCode();
      const state = getScreenState();
      // eslint-disable-next-line no-console
      console.log(
        '[Mini App Context]',
        JSON.stringify(
          {
            code,
            renderedHtml: state.renderedHtml,
            runtimeState: state.runtimeState,
            runtimeError: state.runtimeError,
            recentLogs: state.recentLogs.slice(-20),
            panelSize: state.panelSize,
          },
          null,
          2
        )
      );
    },
  };

  const updateCodeTool: MiniAppBrowserToolDefinition<CodeParams> = {
    id: 'mini_app_update_code',
    description: UPDATE_CODE_DESCRIPTION,
    schema: codeSchema,
    handler: ({ code }) => {
      setCode(code);
    },
  };

  const appendCodeTool: MiniAppBrowserToolDefinition<CodeParams> = {
    id: 'mini_app_append_code',
    description:
      'Append JavaScript code to the existing mini app code. Useful for adding new functionality without replacing everything. The appended code runs after the existing code.',
    schema: codeSchema,
    handler: ({ code }) => {
      const existingCode = getCode();
      const newCode = existingCode ? `${existingCode}\n\n${code}` : code;
      setCode(newCode);
    },
  };

  return [getContextTool, updateCodeTool, appendCodeTool];
};

interface UseMiniAppBrowserToolsOptions {
  miniApp: MiniApp | null;
  onUpdateCode: (code: string) => Promise<void>;
  screenStateRef: React.RefObject<MiniAppScreenState>;
}

/**
 * Hook to register browser tools for AI agent editing of mini apps.
 * Tools are registered in the window registry (for backwards compatibility)
 * and also returned for direct use with the agent builder flyout.
 */
export const useMiniAppBrowserTools = ({
  miniApp,
  onUpdateCode,
  screenStateRef,
}: UseMiniAppBrowserToolsOptions) => {
  const codeRef = useRef<string>(miniApp?.script_code ?? '');

  useEffect(() => {
    codeRef.current = miniApp?.script_code ?? '';
  }, [miniApp?.script_code]);

  const tools = useMemo(() => {
    if (!miniApp) return [];

    return createMiniAppBrowserTools({
      getCode: () => codeRef.current,
      setCode: (code: string) => {
        codeRef.current = code;
        onUpdateCode(code);
      },
      getScreenState: () =>
        screenStateRef.current ?? {
          renderedHtml: '',
          runtimeState: 'idle' as RuntimeState,
          runtimeError: null,
          recentLogs: [],
          panelSize: { width: 0, height: 0 },
        },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniApp?.id]);

  useEffect(() => {
    if (!miniApp || tools.length === 0) return;

    const registry = (window as unknown as { __KIBANA_BROWSER_TOOLS__?: Map<string, unknown> })
      .__KIBANA_BROWSER_TOOLS__;

    if (registry) {
      for (const tool of tools) {
        registry.set(tool.id, tool);
      }
    } else {
      const newRegistry = new Map<string, unknown>();
      for (const tool of tools) {
        newRegistry.set(tool.id, tool);
      }
      (
        window as unknown as { __KIBANA_BROWSER_TOOLS__: Map<string, unknown> }
      ).__KIBANA_BROWSER_TOOLS__ = newRegistry;
    }

    return () => {
      const currentRegistry = (
        window as unknown as { __KIBANA_BROWSER_TOOLS__?: Map<string, unknown> }
      ).__KIBANA_BROWSER_TOOLS__;

      if (currentRegistry) {
        for (const tool of tools) {
          currentRegistry.delete(tool.id);
        }
      }
    };
  }, [miniApp, tools]);

  return tools;
};
