/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findBannedModules,
  findBannedEntryEdges,
  BANNED_SERVER_MODULES,
} from './run_module_graph_gate_cli';

const line = (id: string, parents: string[] = []) =>
  JSON.stringify({ id: `/repo/${id}`, parents: parents.map((p) => `/repo/${p}`) });

describe('findBannedModules', () => {
  it('counts modules per banned package and the dump total', () => {
    const { total, counts } = findBannedModules([
      line('node_modules/@elastic/eui/lib/components/badge/badge.js'),
      line('node_modules/@elastic/eui/lib/services/color/eui_palettes.js'),
      line('node_modules/@langchain/core/dist/messages/index.cjs'),
      line('src/core/packages/root/server-internal/src/root/index.ts'),
      '',
    ]);

    expect(total).toBe(4);
    expect(Object.fromEntries(counts)).toEqual({
      '@elastic/eui': 2,
      '@langchain': 1,
    });
  });

  it('does not flag the allowed theme, react, or emotion packages', () => {
    const { counts } = findBannedModules([
      line('node_modules/@elastic/eui-theme-common/lib/cjs/services/eui_palettes.js'),
      line('node_modules/@elastic/eui-theme-borealis/lib/cjs/index.js'),
      line('node_modules/react/index.js'),
      line('node_modules/react-dom/server.node.js'),
      line('node_modules/@emotion/react/dist/emotion-react.cjs.js'),
      line('node_modules/zod/lib/index.js'),
    ]);

    expect(counts.size).toBe(0);
  });

  it('flags every package in the GenAI stack', () => {
    const ids = [
      'node_modules/langsmith/dist/client.cjs',
      'node_modules/openai/index.js',
      'node_modules/gpt-tokenizer/cjs/main.js',
      'node_modules/js-tiktoken/dist/lite.cjs',
      'node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js',
      'node_modules/google-auth-library/build/src/index.js',
      'node_modules/zod-to-json-schema/dist/cjs/index.js',
      'node_modules/react-intl/lib/index.js',
      'node_modules/react-use/lib/useMountedState.js',
      'node_modules/react-redux/dist/cjs/index.js',
      'node_modules/redux/dist/cjs/redux.cjs',
      'node_modules/@reduxjs/toolkit/dist/cjs/index.js',
      'node_modules/refractor/core.js',
      'node_modules/prismjs/prism.js',
      'node_modules/@elastic/apm-rum-core/dist/lib/index.js',
    ];
    const { counts } = findBannedModules(ids.map((id) => line(id)));

    expect(counts.size).toBe(ids.length);
    for (const count of counts.values()) {
      expect(count).toBe(1);
    }
  });

  it('reports only external import sites, not edges within the banned set', () => {
    const edges = findBannedEntryEdges([
      line('node_modules/@elastic/eui/lib/index.js', [
        'x-pack/plugins/foo/server/plugin.ts',
        'node_modules/@elastic/eui/lib/components/index.js',
      ]),
      line('node_modules/refractor/core.js', ['node_modules/@elastic/eui/lib/code/code.js']),
    ]);

    expect(Object.fromEntries([...edges].map(([k, v]) => [k, [...v]]))).toEqual({
      '@elastic/eui': ['/repo/x-pack/plugins/foo/server/plugin.ts'],
    });
  });

  it('keeps the banned set free of overlapping patterns (one label per module)', () => {
    for (const id of [
      '/repo/node_modules/@elastic/eui/lib/index.js',
      '/repo/node_modules/react-redux/dist/cjs/index.js',
      '/repo/node_modules/redux/dist/cjs/redux.cjs',
    ]) {
      const matching = BANNED_SERVER_MODULES.filter((b) => b.pattern.test(id));
      expect(matching).toHaveLength(1);
    }
  });
});
