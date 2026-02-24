/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useCallback } from 'react';
import type { RuntimeState } from '@kbn/script-panel/public';
import type { AgentBuilderLike } from '../types';

/**
 * Builds a comprehensive screen context description that teaches the agent
 * how mini apps work and directs it to use the server-side tools.
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
    `- Use the mini_app_* tools to modify code. Do NOT output code for the user to copy-paste.`
  );
  parts.push(
    `- When you call any code-modifying tool, the saved object is updated on the server and the app preview reloads automatically.`
  );
  parts.push(``);
  parts.push(`AVAILABLE TOOLS (prefer targeted edits over full rewrites):`);
  parts.push(
    `- mini_app_get_code: Read the current code from the server. Use this first if you need to understand the existing code.`
  );
  parts.push(
    `- mini_app_str_replace: Replace specific text. PREFERRED for targeted edits. Requires exact match.`
  );
  parts.push(`- mini_app_insert_at_line: Insert code at a specific line number (1-indexed).`);
  parts.push(`- mini_app_append_code: Add code at the end of the file.`);
  parts.push(`- mini_app_update_code: Replace ALL code. Use only when rewriting from scratch.`);
  parts.push(``);
  parts.push(`WORKFLOW FOR EDITS:`);
  parts.push(
    `1. ALWAYS call mini_app_get_code first to get the exact current code before using str_replace.`
  );
  parts.push(
    `2. For small changes: Use mini_app_str_replace with enough context to match uniquely.`
  );
  parts.push(
    `3. If str_replace throws an error: The old_string was NOT in the code. Call mini_app_get_code again and retry with the correct text.`
  );
  parts.push(
    `4. For new functions/components: Use mini_app_insert_at_line to add in the right place.`
  );
  parts.push(
    `5. Only use mini_app_update_code when creating a new app or doing a complete rewrite.`
  );
  parts.push(
    `6. For large changes that touch many parts of the code, prefer mini_app_update_code over multiple str_replace calls.`
  );
  parts.push(
    `7. When the app uses ES|QL queries, use the esql tool to test each query BEFORE writing it into the code. This ensures the query syntax is valid and the indices/fields exist. Fix any query errors before proceeding.`
  );
  parts.push(``);

  parts.push(`ENVIRONMENT:`);
  parts.push(`- Mini apps run as JavaScript inside a sandboxed iframe with full DOM access.`);
  parts.push(`- NO imports, NO module system, NO npm packages. Only use the globals provided.`);
  parts.push(
    `- Preact (lightweight React alternative) + htm (JSX-like tagged templates) are pre-loaded as globals.`
  );
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
  parts.push(`Kibana.navigate(url) → Promise<{ navigated: boolean }>`);
  parts.push(
    `  Request navigation to a Kibana URL or external link. The user will see a confirmation dialog.`
  );
  parts.push(`  For Kibana pages use paths like '/app/discover' or '/app/dashboards'.`);
  parts.push(`  For external links use full URLs like 'https://example.com'.`);
  parts.push(``);

  parts.push(`PREACT + HTM (RECOMMENDED for component-based UIs):`);
  parts.push(``);
  parts.push(
    `The iframe has Preact and htm pre-loaded as globals. Use them for React-like component UIs.`
  );
  parts.push(``);
  parts.push(`IMPORTANT: The ONLY globals available are: window.preact, window.html`);
  parts.push(
    `There is NO "preactHtm", NO "React", NO "ReactDOM". Do NOT try to import or require anything.`
  );
  parts.push(``);
  parts.push(`Available globals:`);
  parts.push(`  preact             - the Preact library object`);
  parts.push(`  preact.h           - createElement function`);
  parts.push(`  preact.render      - render(vnode, container) to mount a component tree`);
  parts.push(`  preact.Component   - base class for class components (prefer function components)`);
  parts.push(`  preact.Fragment    - fragment component`);
  parts.push(
    `  preact.hooks.*     - all hooks: useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext`
  );
  parts.push(
    `  html               - htm tagged template literal bound to preact.h. Use like JSX: html\`<div>...</div>\``
  );
  parts.push(``);
  parts.push(`CORRECT setup (copy this exactly):`);
  parts.push(`  const { render } = preact;`);
  parts.push(`  const { useState, useEffect, useRef, useMemo, useCallback } = preact.hooks;`);
  parts.push(``);
  parts.push(
    `  // Components are plain functions. Use html\`...\` instead of JSX. Interpolate with \${}.`
  );
  parts.push(`  function App() {`);
  parts.push(`    const [count, setCount] = useState(0);`);
  parts.push(
    `    return html\`<button onClick=\${() => setCount(c => c + 1)}>Clicked \${count}</button>\`;`
  );
  parts.push(`  }`);
  parts.push(`  render(html\`<\${App} />\`, document.getElementById('root'));`);
  parts.push(``);
  parts.push(`  // Async data fetching with useEffect:`);
  parts.push(`  function DataView() {`);
  parts.push(`    const [rows, setRows] = useState([]);`);
  parts.push(`    useEffect(() => {`);
  parts.push(
    `      Kibana.esql.query({ query: 'FROM logs-* | LIMIT 100' }).then(r => setRows(r.rows));`
  );
  parts.push(`    }, []);`);
  parts.push(`    return html\`<ul>\${rows.map(r => html\`<li>\${r.message}</li>\`)}</ul>\`;`);
  parts.push(`  }`);
  parts.push(``);
  parts.push(`  // Children and composition work like React:`);
  parts.push(`  function Card({ title, children }) {`);
  parts.push(
    `    return html\`<div style="border:1px solid #ddd;padding:16px;border-radius:8px"><h3>\${title}</h3>\${children}</div>\`;`
  );
  parts.push(`  }`);
  parts.push(``);
  parts.push(`IMPORTANT htm syntax notes:`);
  parts.push(`- Self-closing tags: html\`<\${MyComponent} prop="val" />\``);
  parts.push(
    `- Event handlers: use on-prefixed lowercase attrs: onClick, onInput, onChange, onSubmit`
  );
  parts.push(`- Spread props: html\`<div ...\${props} />\``);
  parts.push(
    `- Lists: html\`<ul>\${items.map(i => html\`<li key=\${i.id}>\${i.name}</li>\`)}</ul>\``
  );
  parts.push(`- Conditional rendering: html\`\${show ? html\`<\${Modal} />\` : null}\``);
  parts.push(
    `- Style objects: html\`<div style=\${{ color: 'red', fontSize: '16px' }}>text</div>\``
  );
  parts.push(``);

  parts.push(`DOM ACCESS (also available alongside Preact):`);
  parts.push(
    `The code runs inside a real iframe with full DOM access. After the script loads, the iframe stays alive.`
  );
  parts.push(
    `- Canvas 2D and WebGL: create a <canvas>, get the context, draw freely. Use requestAnimationFrame for animation loops.`
  );
  parts.push(`- SVG: create and manipulate SVG elements for charts and graphics.`);
  parts.push(
    `- setTimeout / setInterval / requestAnimationFrame all work for timers and animation.`
  );
  parts.push(
    `- You can also use plain DOM manipulation with getElementById, createElement, etc. if preferred.`
  );
  parts.push(``);

  parts.push(`COMMON PATTERNS (prefer Preact + htm):`);
  parts.push(``);
  parts.push(`1. Data dashboard (query + render with components):`);
  parts.push(`(async () => {`);
  parts.push(`  const { render } = preact;`);
  parts.push(`  const { useState, useEffect } = preact.hooks;`);
  parts.push(``);
  parts.push(`  function DataTable() {`);
  parts.push(`    const [data, setData] = useState({ columns: [], rows: [] });`);
  parts.push(`    const [loading, setLoading] = useState(true);`);
  parts.push(`    useEffect(() => {`);
  parts.push(`      Kibana.esql.query({ query: 'FROM logs-* | LIMIT 100' })`);
  parts.push(`        .then(r => { setData(r); setLoading(false); })`);
  parts.push(`        .catch(e => { Kibana.log.error(e.message); setLoading(false); });`);
  parts.push(`    }, []);`);
  parts.push(`    if (loading) return html\`<p>Loading...</p>\`;`);
  parts.push(`    return html\``);
  parts.push(`      <table>`);
  parts.push(
    `        <thead><tr>\${data.columns.map(c => html\`<th>\${c.name}</th>\`)}</tr></thead>`
  );
  parts.push(
    `        <tbody>\${data.rows.map(r => html\`<tr>\${data.columns.map(c => html\`<td>\${r[c.name]}</td>\`)}</tr>\`)}</tbody>`
  );
  parts.push(`      </table>\`;`);
  parts.push(`  }`);
  parts.push(`  render(html\`<\${DataTable} />\`, document.getElementById('root'));`);
  parts.push(`})();`);
  parts.push(``);
  parts.push(`2. Interactive search form:`);
  parts.push(`(async () => {`);
  parts.push(`  const { render } = preact;`);
  parts.push(`  const { useState, useCallback } = preact.hooks;`);
  parts.push(``);
  parts.push(`  function SearchApp() {`);
  parts.push(`    const [query, setQuery] = useState('');`);
  parts.push(`    const [results, setResults] = useState([]);`);
  parts.push(`    const search = useCallback(async () => {`);
  parts.push(`      const { rows } = await Kibana.esql.query({`);
  parts.push(`        query: \\\`FROM my-index | WHERE name LIKE "*\\\${query}*" | LIMIT 20\\\``);
  parts.push(`      });`);
  parts.push(`      setResults(rows);`);
  parts.push(`    }, [query]);`);
  parts.push(`    return html\``);
  parts.push(
    `      <div><input value=\${query} onInput=\${e => setQuery(e.target.value)} placeholder="Search..." />`
  );
  parts.push(`      <button onClick=\${search}>Search</button></div>`);
  parts.push(`      <ul>\${results.map(r => html\`<li>\${r.name}</li>\`)}</ul>\`;`);
  parts.push(`  }`);
  parts.push(`  render(html\`<\${SearchApp} />\`, document.getElementById('root'));`);
  parts.push(`})();`);
  parts.push(``);
  parts.push(`3. Canvas visualization (DOM approach is fine here):`);
  parts.push(`(async () => {`);
  parts.push(`  const { width, height } = await Kibana.panel.getSize();`);
  parts.push(`  Kibana.render.setContent('<canvas id="c"></canvas>');`);
  parts.push(`  const canvas = document.getElementById('c');`);
  parts.push(`  canvas.width = width; canvas.height = height;`);
  parts.push(`  const ctx = canvas.getContext('2d');`);
  parts.push(`  // draw with ctx.fillRect, ctx.arc, ctx.lineTo, etc.`);
  parts.push(`})();`);
  parts.push(``);
  parts.push(`4. Live-updating dashboard:`);
  parts.push(`(async () => {`);
  parts.push(`  const { render } = preact;`);
  parts.push(`  const { useState, useEffect } = preact.hooks;`);
  parts.push(``);
  parts.push(`  function LiveCount() {`);
  parts.push(`    const [count, setCount] = useState('-');`);
  parts.push(`    useEffect(() => {`);
  parts.push(`      const refresh = async () => {`);
  parts.push(
    `        const { rowCount } = await Kibana.esql.query({ query: 'FROM logs-* | STATS count=COUNT(*)' });`
  );
  parts.push(`        setCount(rowCount);`);
  parts.push(`      };`);
  parts.push(`      refresh();`);
  parts.push(`      const id = setInterval(refresh, 5000);`);
  parts.push(`      return () => clearInterval(id);`);
  parts.push(`    }, []);`);
  parts.push(`    return html\`<div style="padding:20px;font-size:24px">Count: \${count}</div>\`;`);
  parts.push(`  }`);
  parts.push(`  render(html\`<\${LiveCount} />\`, document.getElementById('root'));`);
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
  miniAppId: string | undefined;
  name: string;
  scriptCode: string;
  runtimeState: RuntimeState;
  runtimeError: string | null;
}

/**
 * Hook that wires up the agent builder flyout with screen context for a mini app.
 * The actual code-editing tools are registered server-side and operate on the
 * saved object directly. This hook provides context so the LLM knows which
 * mini app to target (via mini_app_id in the attachment). Using the custom
 * `mini_app_context` attachment type triggers tool selection so the agent
 * can access the mini_app_* tools.
 */
export const useAgentBuilder = ({
  agentBuilder,
  miniAppId,
  name,
  scriptCode,
  runtimeState,
  runtimeError,
}: UseAgentBuilderOptions) => {
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
        attachments: [
          {
            id: 'mini-app-context',
            type: 'mini_app_context',
            data: {
              app: 'mini_apps',
              description,
              additional_data: {
                runtime_state: runtimeState,
                ...(runtimeError ? { runtime_error: runtimeError } : {}),
                ...(miniAppId ? { mini_app_id: miniAppId } : {}),
              },
            } as unknown as Record<string, unknown>,
            hidden: true,
          },
        ],
      });
    },
    [miniAppId, name, scriptCode, runtimeState, runtimeError]
  );

  useEffect(() => {
    if (!agentBuilder) return;

    setConfig(agentBuilder);

    return () => {
      agentBuilder.clearConversationFlyoutActiveConfig();
    };
  }, [agentBuilder, setConfig]);
};
