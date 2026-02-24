/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { MINI_APP_SAVED_OBJECT_TYPE } from '../../common';
import type { MiniAppAttributes } from '../../common';
import type { AgentBuilderServerLike } from '../types';

export const MINI_APP_ATTACHMENT_TYPE = 'mini_app_context';

const MINI_APP_TOOL_IDS = [
  'mini_app_get_code',
  'mini_app_update_code',
  'mini_app_str_replace',
  'mini_app_insert_at_line',
  'mini_app_append_code',
];

interface ToolHandlerContext {
  savedObjectsClient: SavedObjectsClientContract;
  attachments: {
    getActive: () => Array<{
      id: string;
      type: string;
      versions: Array<{ version: number; data: any }>;
      current_version: number;
    }>;
  };
  logger: { debug: (msg: string) => void };
}

const getMiniAppIdFromContext = (context: ToolHandlerContext): string => {
  const active = context.attachments.getActive();
  const miniAppCtx = active.find((a) => a.type === MINI_APP_ATTACHMENT_TYPE);
  if (!miniAppCtx) {
    throw new Error(
      'No mini app context found. This tool can only be used when a mini app is open in the editor.'
    );
  }
  const latestVersion = miniAppCtx.versions.find(
    (v) => v.version === miniAppCtx.current_version
  );
  const miniAppId = latestVersion?.data?.additional_data?.mini_app_id;
  if (!miniAppId) {
    throw new Error(
      'No mini app ID found in context. Please save the mini app before using AI tools.'
    );
  }
  return miniAppId;
};

const readMiniApp = async (
  savedObjectsClient: SavedObjectsClientContract,
  id: string
): Promise<MiniAppAttributes> => {
  const so = await savedObjectsClient.get<MiniAppAttributes>(MINI_APP_SAVED_OBJECT_TYPE, id);
  return so.attributes;
};

const writeMiniAppCode = async (
  savedObjectsClient: SavedObjectsClientContract,
  id: string,
  scriptCode: string
): Promise<void> => {
  await savedObjectsClient.update<MiniAppAttributes>(MINI_APP_SAVED_OBJECT_TYPE, id, {
    script_code: scriptCode,
    updated_at: new Date().toISOString(),
  });
};

const getCodeSchema = z.object({});

const updateCodeSchema = z.object({
  code: z.string().describe('The complete JavaScript code for the mini app.'),
});

const strReplaceSchema = z.object({
  old_string: z
    .string()
    .describe(
      'The exact text to find in the code. Must match exactly including whitespace and indentation.'
    ),
  new_string: z.string().describe('The replacement text. Can be empty to delete the old_string.'),
  replace_all: z
    .boolean()
    .optional()
    .describe('If true, replace all occurrences. If false/omitted, replace only the first match.'),
});

const insertAtLineSchema = z.object({
  line: z
    .number()
    .describe(
      'The line number to insert at (1-indexed). The new code is inserted before this line.'
    ),
  code: z.string().describe('The code to insert.'),
});

const appendCodeSchema = z.object({
  code: z.string().describe('The JavaScript code to append to the existing mini app code.'),
});

const GET_CODE_DESCRIPTION =
  'Get the current JavaScript code of the mini app. Returns the full code as a string. Use this to inspect the current state before making targeted edits with mini_app_str_replace.';

const UPDATE_CODE_DESCRIPTION = `Replace the mini app's JavaScript code entirely. The app instantly reloads with the new code.

Use this tool only when you need to rewrite the entire app from scratch. For incremental changes, prefer:
- mini_app_str_replace: to modify specific parts of the code
- mini_app_insert_at_line: to add new code at a specific location
- mini_app_append_code: to add code at the end

RULES:
- Provide the COMPLETE code. This replaces everything.
- NO imports, NO require, NO module system, NO npm packages. Everything is a global in the iframe.
- The ONLY globals are: preact, preact.hooks, html, Kibana. There is NO "preactHtm", NO "React", NO "ReactDOM".
- Always start with: const { render } = preact; const { useState, useEffect, useRef, useMemo, useCallback } = preact.hooks;
- Wrap in an async IIFE: (async () => { ... })();
- Data: Kibana.esql.query({ query }) for Elasticsearch data. fetch/XHR is blocked.
- Rendering: Use Preact's render() with htm tagged template: render(html\`<\${App} />\`, document.getElementById('root'))
- CSS: inline <style> tags only.`;

const STR_REPLACE_DESCRIPTION = `Replace specific text in the mini app's code. This is the PREFERRED way to make targeted edits.

IMPORTANT:
- old_string must match EXACTLY (including whitespace and indentation)
- Include enough context in old_string to make it unique
- This tool THROWS AN ERROR if old_string is not found. If you get an error, call mini_app_get_code first to see the exact current code, then retry with the correct old_string.
- After each successful replacement, subsequent calls see the updated code immediately.
- By default only the first match is replaced; set replace_all: true for all occurrences`;

const INSERT_AT_LINE_DESCRIPTION = `Insert code at a specific line number. The new code is inserted BEFORE the specified line.

Use this for:
- Adding new functions or components
- Inserting imports/setup code near the top
- Adding code in the middle of the file

Line numbers are 1-indexed (first line is 1).`;

const APPEND_CODE_DESCRIPTION =
  'Append JavaScript code to the existing mini app code. Useful for adding new functionality without replacing everything. The appended code runs after the existing code.';

const createResult = (message: string) => ({
  results: [{ type: 'other' as const, data: { message } }],
});

export const registerMiniAppTools = (agentBuilder: AgentBuilderServerLike) => {
  agentBuilder.tools.register({
    id: 'mini_app_get_code',
    type: 'builtin',
    description: GET_CODE_DESCRIPTION,
    schema: getCodeSchema,
    tags: [],
    handler: async (_params: any, context: ToolHandlerContext) => {
      const miniAppId = getMiniAppIdFromContext(context);
      const attrs = await readMiniApp(context.savedObjectsClient, miniAppId);
      context.logger.debug(`mini_app_get_code: read ${attrs.script_code.length} chars`);
      return createResult(attrs.script_code || '(empty - no code yet)');
    },
  });

  agentBuilder.tools.register({
    id: 'mini_app_update_code',
    type: 'builtin',
    description: UPDATE_CODE_DESCRIPTION,
    schema: updateCodeSchema,
    tags: [],
    handler: async ({ code }: { code: string }, context: ToolHandlerContext) => {
      const miniAppId = getMiniAppIdFromContext(context);
      await writeMiniAppCode(context.savedObjectsClient, miniAppId, code);
      context.logger.debug(`mini_app_update_code: wrote ${code.length} chars`);
      return createResult('Code replaced successfully.');
    },
  });

  agentBuilder.tools.register({
    id: 'mini_app_str_replace',
    type: 'builtin',
    description: STR_REPLACE_DESCRIPTION,
    schema: strReplaceSchema,
    tags: [],
    handler: async (
      {
        old_string: oldString,
        new_string: newString,
        replace_all: replaceAll,
      }: {
        old_string: string;
        new_string: string;
        replace_all?: boolean;
      },
      context: ToolHandlerContext
    ) => {
      const miniAppId = getMiniAppIdFromContext(context);
      const attrs = await readMiniApp(context.savedObjectsClient, miniAppId);
      const existing = attrs.script_code;

      if (!existing.includes(oldString)) {
        throw new Error(
          `str_replace FAILED: old_string not found in code. The code may have changed since you last read it. ` +
            `Call mini_app_get_code to see the current code, then retry with the correct old_string.`
        );
      }

      const updated = replaceAll
        ? existing.split(oldString).join(newString)
        : existing.replace(oldString, newString);

      await writeMiniAppCode(context.savedObjectsClient, miniAppId, updated);
      context.logger.debug(`mini_app_str_replace: replaced in ${miniAppId}`);
      return createResult('Code updated via str_replace successfully.');
    },
  });

  agentBuilder.tools.register({
    id: 'mini_app_insert_at_line',
    type: 'builtin',
    description: INSERT_AT_LINE_DESCRIPTION,
    schema: insertAtLineSchema,
    tags: [],
    handler: async (
      { line, code }: { line: number; code: string },
      context: ToolHandlerContext
    ) => {
      const miniAppId = getMiniAppIdFromContext(context);
      const attrs = await readMiniApp(context.savedObjectsClient, miniAppId);
      const lines = attrs.script_code.split('\n');
      const insertIndex = Math.max(0, Math.min(line - 1, lines.length));
      lines.splice(insertIndex, 0, code);
      const updated = lines.join('\n');

      await writeMiniAppCode(context.savedObjectsClient, miniAppId, updated);
      context.logger.debug(`mini_app_insert_at_line: inserted at line ${insertIndex + 1}`);
      return createResult(`Code inserted at line ${insertIndex + 1} successfully.`);
    },
  });

  agentBuilder.tools.register({
    id: 'mini_app_append_code',
    type: 'builtin',
    description: APPEND_CODE_DESCRIPTION,
    schema: appendCodeSchema,
    tags: [],
    handler: async ({ code }: { code: string }, context: ToolHandlerContext) => {
      const miniAppId = getMiniAppIdFromContext(context);
      const attrs = await readMiniApp(context.savedObjectsClient, miniAppId);
      const updated = attrs.script_code ? `${attrs.script_code}\n\n${code}` : code;

      await writeMiniAppCode(context.savedObjectsClient, miniAppId, updated);
      context.logger.debug(`mini_app_append_code: appended ${code.length} chars`);
      return createResult('Code appended successfully.');
    },
  });
};

const miniAppContextDataSchema = z.object({
  app: z.string().optional(),
  description: z.string().optional(),
  additional_data: z.record(z.string()).optional(),
});

/**
 * Registers a custom attachment type that exposes the mini app tools.
 * When a conversation includes an attachment of this type, the agent
 * automatically gains access to the mini_app_* tools.
 */
export const registerMiniAppAttachmentType = (agentBuilder: AgentBuilderServerLike) => {
  agentBuilder.attachments.registerType({
    id: MINI_APP_ATTACHMENT_TYPE,
    validate: (input: unknown) => {
      const result = miniAppContextDataSchema.safeParse(input);
      if (result.success) {
        return { valid: true, data: result.data };
      }
      return { valid: false, error: result.error.message };
    },
    format: (attachment: { data: any }) => ({
      getRepresentation: () => {
        const { data } = attachment;
        const parts: string[] = [];
        if (data.app) parts.push(`App: ${data.app}`);
        if (data.description) parts.push(`Description: ${data.description}`);
        if (data.additional_data) {
          parts.push(`Additional data: ${JSON.stringify(data.additional_data)}`);
        }
        return { type: 'text', value: parts.join('\n') };
      },
    }),
    isReadonly: true,
    getTools: () => MINI_APP_TOOL_IDS,
  });
};
