/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { z } from '@kbn/zod';
import type { RuntimeState } from '@kbn/script-panel/public';
import type { AgentBuilderLike } from '../types';

const codeSchema = z.object({
  code: z.string().describe('The complete JavaScript code for the mini app.'),
});

const UPDATE_CODE_DESCRIPTION = `Replace the mini app's JavaScript code. The app instantly reloads with the new code.

RULES:
- Provide the COMPLETE code. This replaces everything.
- Plain vanilla JavaScript only. NO React, NO JSX, NO imports.
- Wrap in an async IIFE: (async () => { ... })();
- Data: Kibana.esql.query({ query }) for Elasticsearch data. fetch/XHR is blocked.
- Rendering: Kibana.render.setContent(html) sets initial HTML, then use full DOM APIs (getElementById, addEventListener, createElement, Canvas 2D/WebGL, SVG, requestAnimationFrame, setInterval) for interactivity and animation.
- CSS: inline <style> tags only.`;

const APPEND_CODE_DESCRIPTION =
  'Append JavaScript code to the existing mini app code. Useful for adding new functionality without replacing everything. The appended code runs after the existing code.';

/**
 * Builds a comprehensive screen context description that teaches the agent
 * how mini apps work and directs it to use the browser tools.
 */
export const buildScreenContextDescription = ({
  name,
  scriptCode,
  runtimeState,
  runtimeError,
}: {
  name: string;
  scriptCode: string;
  runtimeState: RuntimeState;
  runtimeError: string | null;
}): string => {
  const parts: string[] = [];

  parts.push(`The user is viewing a Kibana Mini App called "${name}".`);
  parts.push(``);

  parts.push(`CRITICAL INSTRUCTIONS FOR MODIFYING THIS MINI APP:`);
  parts.push(
    `- To change the code, you MUST call the "mini_app_update_code" browser tool with the complete new code.`
  );
  parts.push(
    `- Do NOT output code in your response for the user to copy-paste. Always use the tool.`
  );
  parts.push(`- When you call the tool, the app instantly reloads with the new code.`);
  parts.push(``);

  parts.push(`ENVIRONMENT:`);
  parts.push(
    `- Mini apps run as plain vanilla JavaScript inside a sandboxed iframe with full DOM access.`
  );
  parts.push(`- There is NO React, NO JSX, NO npm packages, NO imports, NO module system.`);
  parts.push(
    `- The iframe has no network access (fetch/XHR are blocked). All external data comes from Kibana.esql.query().`
  );
  parts.push(
    `- CSS must be inline (<style> tags or style attributes). No external stylesheets or fonts.`
  );
  parts.push(`- Images via data: or blob: URIs only.`);
  parts.push(``);

  parts.push(`KIBANA API (window.Kibana):`);
  parts.push(``);
  parts.push(`Kibana.esql.query({ query, params?, useContext? })`);
  parts.push(
    `  Execute an ES|QL query. Returns Promise<{ columns: [{name, type}], rows: [Record], rowCount }>.`
  );
  parts.push(``);
  parts.push(`Kibana.render.setContent(html)`);
  parts.push(
    `  Set the innerHTML of <div id="root">. Use for initial layout. Returns Promise<void>.`
  );
  parts.push(``);
  parts.push(`Kibana.render.setError(message)`);
  parts.push(`  Show an error. Returns Promise<void>.`);
  parts.push(``);
  parts.push(`Kibana.panel.getSize() → Promise<{ width, height }>`);
  parts.push(`Kibana.panel.onResize(cb) → unsubscribe fn`);
  parts.push(`Kibana.log.info/warn/error(...args)`);
  parts.push(``);

  parts.push(`DOM ACCESS & REACTIVITY:`);
  parts.push(
    `The code runs inside a real iframe with full DOM access. After the script loads, the iframe stays alive.`
  );
  parts.push(`You are NOT limited to static HTML. You can build fully interactive UIs:`);
  parts.push(``);
  parts.push(
    `- document.getElementById('root') is the root container. You can use setContent() for initial HTML,`
  );
  parts.push(
    `  then querySelector/getElementById to bind event listeners. Or skip setContent entirely and build`
  );
  parts.push(`  the DOM imperatively with createElement/appendChild.`);
  parts.push(
    `- All standard DOM events work: click, input, change, mousemove, keydown, submit, etc.`
  );
  parts.push(
    `- Canvas 2D and WebGL: create a <canvas>, get the context, draw freely. Use requestAnimationFrame for animation loops.`
  );
  parts.push(`- SVG: create and manipulate SVG elements for charts and graphics.`);
  parts.push(
    `- setTimeout / setInterval / requestAnimationFrame all work for timers and animation.`
  );
  parts.push(`- Forms, inputs, selects, textareas all work with normal event handling.`);
  parts.push(
    `- You can create elements dynamically, remove them, toggle classes, update textContent or innerHTML on any element.`
  );
  parts.push(
    `- For state management, just use plain variables in your closure. The async IIFE scope persists for the app's lifetime.`
  );
  parts.push(``);

  parts.push(`COMMON PATTERNS:`);
  parts.push(``);
  parts.push(`1. Data dashboard (query + render):`);
  parts.push(`(async () => {`);
  parts.push(
    `  const { rows, columns } = await Kibana.esql.query({ query: 'FROM logs-* | LIMIT 100' });`
  );
  parts.push(`  Kibana.render.setContent('<table id="tbl"></table>');`);
  parts.push(`  const tbl = document.getElementById('tbl');`);
  parts.push(`  // ... build rows with createElement, appendChild`);
  parts.push(`})();`);
  parts.push(``);
  parts.push(`2. Interactive form (user input triggers queries):`);
  parts.push(`(async () => {`);
  parts.push(
    `  Kibana.render.setContent('<input id="q" placeholder="Search..." /><div id="results"></div>');`
  );
  parts.push(`  const input = document.getElementById('q');`);
  parts.push(`  const results = document.getElementById('results');`);
  parts.push(`  input.addEventListener('input', async () => {`);
  parts.push(`    const { rows } = await Kibana.esql.query({`);
  parts.push(
    `      query: \\\`FROM my-index | WHERE name LIKE "*\\\${input.value}*" | LIMIT 20\\\``
  );
  parts.push(`    });`);
  parts.push(
    `    results.innerHTML = rows.map(r => '<div>' + r.name + '</div>').join('');`
  );
  parts.push(`  });`);
  parts.push(`})();`);
  parts.push(``);
  parts.push(`3. Canvas visualization:`);
  parts.push(`(async () => {`);
  parts.push(`  const { width, height } = await Kibana.panel.getSize();`);
  parts.push(`  Kibana.render.setContent('<canvas id="c"></canvas>');`);
  parts.push(`  const canvas = document.getElementById('c');`);
  parts.push(`  canvas.width = width; canvas.height = height;`);
  parts.push(`  const ctx = canvas.getContext('2d');`);
  parts.push(`  // draw with ctx.fillRect, ctx.arc, ctx.lineTo, etc.`);
  parts.push(`})();`);
  parts.push(``);
  parts.push(`4. Live-updating (periodic refresh):`);
  parts.push(`(async () => {`);
  parts.push(`  async function refresh() {`);
  parts.push(`    const { rows } = await Kibana.esql.query({ query: '...' });`);
  parts.push(`    document.getElementById('count').textContent = rows.length;`);
  parts.push(`  }`);
  parts.push(`  Kibana.render.setContent('<div>Count: <span id="count">-</span></div>');`);
  parts.push(`  refresh();`);
  parts.push(`  setInterval(refresh, 5000);`);
  parts.push(`})();`);
  parts.push(``);

  if (runtimeState !== 'idle') {
    parts.push(`CURRENT STATE: ${runtimeState}`);
  }
  if (runtimeError) {
    parts.push(`RUNTIME ERROR: ${runtimeError}`);
  }

  if (scriptCode) {
    parts.push(``);
    parts.push(`CURRENT CODE:`);
    parts.push('```');
    parts.push(scriptCode);
    parts.push('```');
  } else {
    parts.push(`The mini app has no code yet. The user wants you to create one.`);
  }

  return parts.join('\n');
};

interface UseAgentBuilderOptions {
  agentBuilder?: AgentBuilderLike;
  name: string;
  scriptCode: string;
  runtimeState: RuntimeState;
  runtimeError: string | null;
  onUpdateCode: (code: string) => void;
}

/**
 * Hook that wires up the agent builder flyout with browser tools and
 * screen context for a mini app. Works on both the editor and runner pages.
 */
export const useAgentBuilder = ({
  agentBuilder,
  name,
  scriptCode,
  runtimeState,
  runtimeError,
  onUpdateCode,
}: UseAgentBuilderOptions) => {
  const codeRef = useRef(scriptCode);
  useEffect(() => {
    codeRef.current = scriptCode;
  }, [scriptCode]);

  const onUpdateCodeRef = useRef(onUpdateCode);
  useEffect(() => {
    onUpdateCodeRef.current = onUpdateCode;
  }, [onUpdateCode]);

  const tools = useMemo(() => {
    return [
      {
        id: 'mini_app_update_code',
        description: UPDATE_CODE_DESCRIPTION,
        schema: codeSchema,
        handler: ({ code }: { code: string }) => {
          onUpdateCodeRef.current(code);
        },
      },
      {
        id: 'mini_app_append_code',
        description: APPEND_CODE_DESCRIPTION,
        schema: codeSchema,
        handler: ({ code }: { code: string }) => {
          const existing = codeRef.current;
          onUpdateCodeRef.current(existing ? `${existing}\n\n${code}` : code);
        },
      },
    ];
  }, []);

  const setConfig = useCallback(
    (ab: AgentBuilderLike) => {
      const description = buildScreenContextDescription({
        name: name || 'Untitled Mini App',
        scriptCode,
        runtimeState,
        runtimeError,
      });

      ab.setConversationFlyoutActiveConfig({
        sessionTag: 'mini_apps',
        browserApiTools: tools,
        attachments: [
          {
            id: 'mini-app-screen-context',
            type: 'screen_context',
            data: {
              app: 'mini_apps',
              description,
              additional_data: {
                runtime_state: runtimeState,
                ...(runtimeError ? { runtime_error: runtimeError } : {}),
              },
            } as unknown as Record<string, unknown>,
            hidden: true,
          },
        ],
      });
    },
    [name, scriptCode, runtimeState, runtimeError, tools]
  );

  useEffect(() => {
    if (!agentBuilder) return;

    setConfig(agentBuilder);

    return () => {
      agentBuilder.clearConversationFlyoutActiveConfig();
    };
  }, [agentBuilder, setConfig]);
};
