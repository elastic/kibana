/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { i18n } from '@kbn/i18n';

/**
 * Browser tool definition shape - minimal type for browser-side tools
 * This mirrors the shape expected by agent builder but avoids the x-pack dependency
 */
export interface ScriptPanelBrowserToolDefinition<TParams = unknown> {
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
 * Creates browser API tools for in-place editing of a script panel.
 *
 * @param options.getCode - Function to get the current script code
 * @param options.setCode - Function to update the script code
 */
export const createScriptPanelBrowserTools = ({
  getCode,
  setCode,
}: {
  getCode: () => string;
  setCode: (code: string) => void;
}): Array<
  ScriptPanelBrowserToolDefinition<EmptyParams> | ScriptPanelBrowserToolDefinition<CodeParams>
> => {
  const getCodeTool: ScriptPanelBrowserToolDefinition<EmptyParams> = {
    id: 'script_panel_get_code',
    description: i18n.translate('scriptPanel.browserTools.getCode.description', {
      defaultMessage:
        'Get the current JavaScript code of the focused script panel. Returns the code as a string.',
    }),
    schema: emptySchema,
    handler: () => {
      // This is read-only, the LLM will see the result
      const code = getCode();
      // eslint-disable-next-line no-console
      console.log('[Script Panel] Current code retrieved:', code.length, 'characters');
    },
  };

  const updateCodeTool: ScriptPanelBrowserToolDefinition<CodeParams> = {
    id: 'script_panel_update_code',
    description: i18n.translate('scriptPanel.browserTools.updateCode.description', {
      defaultMessage: `Update the JavaScript code of the focused script panel.
The code runs in a sandboxed iframe with access to the Kibana runtime API:
- Kibana.esql.query({ query, params?, useContext? }) - Execute ES|QL queries
- Kibana.panel.getSize() - Get panel dimensions
- Kibana.panel.onResize(callback) - Subscribe to resize events
- Kibana.render.setContent(html) - Set panel HTML content
- Kibana.render.setError(message) - Display error state
- Kibana.log.info/warn/error(...) - Logging

Code must be wrapped in an async IIFE: (async () => { ... })();`,
    }),
    schema: codeSchema,
    handler: ({ code }) => {
      setCode(code);
      // eslint-disable-next-line no-console
      console.log('[Script Panel] Code updated:', code.length, 'characters');
    },
  };

  const appendCodeTool: ScriptPanelBrowserToolDefinition<CodeParams> = {
    id: 'script_panel_append_code',
    description: i18n.translate('scriptPanel.browserTools.appendCode.description', {
      defaultMessage:
        'Append JavaScript code to the existing script panel code. Useful for adding new functionality without replacing everything.',
    }),
    schema: codeSchema,
    handler: ({ code }) => {
      const existingCode = getCode();
      const newCode = existingCode ? `${existingCode}\n\n${code}` : code;
      setCode(newCode);
      // eslint-disable-next-line no-console
      console.log('[Script Panel] Code appended:', code.length, 'characters');
    },
  };

  return [getCodeTool, updateCodeTool, appendCodeTool];
};
