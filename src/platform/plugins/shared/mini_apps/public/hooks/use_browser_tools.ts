/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { z } from '@kbn/zod';
import { i18n } from '@kbn/i18n';
import type { MiniApp } from '../../common';

/**
 * Browser tool definition shape - minimal type for browser-side tools
 * This mirrors the shape expected by agent builder
 */
export interface MiniAppBrowserToolDefinition<TParams = unknown> {
  /** Tool identifier */
  id: string;
  /** Description for the LLM */
  description: string;
  /** Zod schema for parameters */
  schema: z.ZodType<TParams>;
  /** Handler executed in browser */
  handler: (params: TParams) => void | Promise<void>;
}

// Schema types for the browser tools
const emptySchema = z.object({});
const codeSchema = z.object({
  code: z.string().describe('The JavaScript code.'),
});

type EmptyParams = z.infer<typeof emptySchema>;
type CodeParams = z.infer<typeof codeSchema>;

/**
 * Creates browser API tools for in-place editing of a mini app.
 *
 * @param options.getCode - Function to get the current script code
 * @param options.setCode - Function to update the script code
 */
export const createMiniAppBrowserTools = ({
  getCode,
  setCode,
}: {
  getCode: () => string;
  setCode: (code: string) => void;
}): Array<MiniAppBrowserToolDefinition<EmptyParams> | MiniAppBrowserToolDefinition<CodeParams>> => {
  const getCodeTool: MiniAppBrowserToolDefinition<EmptyParams> = {
    id: 'mini_app_get_code',
    description: i18n.translate('miniApps.browserTools.getCode.description', {
      defaultMessage:
        'Get the current JavaScript code of the focused mini app. Returns the code as a string.',
    }),
    schema: emptySchema,
    handler: () => {
      // This is read-only, the LLM will see the result
      const code = getCode();
      // eslint-disable-next-line no-console
      console.log('[Mini App] Current code retrieved:', code.length, 'characters');
    },
  };

  const updateCodeTool: MiniAppBrowserToolDefinition<CodeParams> = {
    id: 'mini_app_update_code',
    description: i18n.translate('miniApps.browserTools.updateCode.description', {
      defaultMessage: `Update the JavaScript code of the focused mini app.
The code runs in a sandboxed iframe with access to the Kibana runtime API:
- Kibana.esql.query({ query, params?, useContext? }) - Execute ES|QL queries
- Kibana.panel.getSize() - Get app area dimensions
- Kibana.panel.onResize(callback) - Subscribe to resize events
- Kibana.render.setContent(html) - Set app HTML content
- Kibana.render.setError(message) - Display error state
- Kibana.log.info/warn/error(...) - Logging

Code must be wrapped in an async IIFE: (async () => { ... })();`,
    }),
    schema: codeSchema,
    handler: ({ code }) => {
      setCode(code);
      // eslint-disable-next-line no-console
      console.log('[Mini App] Code updated:', code.length, 'characters');
    },
  };

  const appendCodeTool: MiniAppBrowserToolDefinition<CodeParams> = {
    id: 'mini_app_append_code',
    description: i18n.translate('miniApps.browserTools.appendCode.description', {
      defaultMessage:
        'Append JavaScript code to the existing mini app code. Useful for adding new functionality without replacing everything.',
    }),
    schema: codeSchema,
    handler: ({ code }) => {
      const existingCode = getCode();
      const newCode = existingCode ? `${existingCode}\n\n${code}` : code;
      setCode(newCode);
      // eslint-disable-next-line no-console
      console.log('[Mini App] Code appended:', code.length, 'characters');
    },
  };

  return [getCodeTool, updateCodeTool, appendCodeTool];
};

interface UseMiniAppBrowserToolsOptions {
  miniApp: MiniApp | null;
  onUpdateCode: (code: string) => Promise<void>;
}

/**
 * Hook to register browser tools for AI agent editing of mini apps.
 * Tools are registered when the mini app is focused and unregistered on cleanup.
 */
export const useMiniAppBrowserTools = ({
  miniApp,
  onUpdateCode,
}: UseMiniAppBrowserToolsOptions): void => {
  const codeRef = useRef<string>(miniApp?.script_code ?? '');

  // Keep the code ref in sync
  useEffect(() => {
    codeRef.current = miniApp?.script_code ?? '';
  }, [miniApp?.script_code]);

  useEffect(() => {
    if (!miniApp) return;

    // Create the browser tools
    const tools = createMiniAppBrowserTools({
      getCode: () => codeRef.current,
      setCode: (code: string) => {
        codeRef.current = code;
        onUpdateCode(code);
      },
    });

    // Register tools with the browser tools registry
    // The registry is accessed via window.__KIBANA_BROWSER_TOOLS__
    // This is the same pattern used by script_panel
    const registry = (window as unknown as { __KIBANA_BROWSER_TOOLS__?: Map<string, unknown> })
      .__KIBANA_BROWSER_TOOLS__;

    if (registry) {
      for (const tool of tools) {
        registry.set(tool.id, tool);
      }
    } else {
      // Create registry if it doesn't exist
      const newRegistry = new Map<string, unknown>();
      for (const tool of tools) {
        newRegistry.set(tool.id, tool);
      }
      (
        window as unknown as { __KIBANA_BROWSER_TOOLS__: Map<string, unknown> }
      ).__KIBANA_BROWSER_TOOLS__ = newRegistry;
    }

    // Log registration for debugging
    // eslint-disable-next-line no-console
    console.log('[Mini App] Browser tools registered for:', miniApp.name);

    // Cleanup: unregister tools
    return () => {
      const currentRegistry = (
        window as unknown as { __KIBANA_BROWSER_TOOLS__?: Map<string, unknown> }
      ).__KIBANA_BROWSER_TOOLS__;

      if (currentRegistry) {
        for (const tool of tools) {
          currentRegistry.delete(tool.id);
        }
      }
      // eslint-disable-next-line no-console
      console.log('[Mini App] Browser tools unregistered for:', miniApp.name);
    };
  }, [miniApp, onUpdateCode]);
};
