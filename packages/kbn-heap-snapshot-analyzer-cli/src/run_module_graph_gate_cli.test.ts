/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findBannedModules, findBannedEntryEdges } from './run_module_graph_gate_cli';

const line = (id: string, parents: string[] = []) =>
  JSON.stringify({ id: `/repo/${id}`, parents: parents.map((p) => `/repo/${p}`) });

describe('findBannedModules', () => {
  it('counts modules per banned package and the dump total', () => {
    const { total, counts } = findBannedModules([
      line('node_modules/@elastic/eui/lib/components/badge/badge.js'),
      line('node_modules/@elastic/eui/lib/services/color/eui_palettes.js'),
      line('src/core/packages/root/server-internal/src/root/index.ts'),
      '',
    ]);

    expect(total).toBe(3);
    expect(Object.fromEntries(counts)).toEqual({ '@elastic/eui': 2 });
  });

  it('does not flag packages outside the banned set', () => {
    const { counts } = findBannedModules([
      line('node_modules/@elastic/eui-theme-common/lib/cjs/services/eui_palettes.js'),
      line('node_modules/@elastic/eui-theme-borealis/lib/cjs/index.js'),
      line('node_modules/react/index.js'),
      line('node_modules/react-dom/server.node.js'),
      line('node_modules/@emotion/react/dist/emotion-react.cjs.js'),
      line('node_modules/react-intl/lib/index.js'),
      line('node_modules/@langchain/core/dist/messages/index.cjs'),
    ]);

    expect(counts.size).toBe(0);
  });
});

describe('findBannedEntryEdges', () => {
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
});
