/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Kibana-side counterpart to upstream's `smoke:exports`: proves the vendored
// tree resolves and runs after a re-sync, not just that its declarations
// type-check. `scripts/sync_dist.mjs` rewrites every cross-package specifier
// to a relative path, so a missed entry point in that rewrite surfaces here as
// a module-resolution failure rather than at Kibana startup.

import { createElement } from 'react';
import { z } from '@kbn/zod';

import { getViewSpecSchema, renderHTML, renderMarkdown, renderText, validateView } from '.';
import { donut, graph, statGroup, view } from './builders';
import { createKibanaRuntime } from './compose';
import { definePrimitive, definePrimitivePack, type PrimitiveNode } from './sdk';

describe('vendored @elastic/adaptive-ui-host-kibana surface', () => {
  const spec = view({
    title: 'Cluster health',
    body: [
      statGroup({ stats: [{ label: 'Shards', value: '412', tone: 'success' }] }),
      donut({ segments: [{ label: 'Errors', value: 4 }] }),
      graph({
        nodes: [{ id: 'ingest' }, { id: 'hot-tier', tone: 'danger' }],
        edges: [{ source: 'ingest', target: 'hot-tier', label: 'indexing' }],
      }),
    ],
  });

  it('validates a spec spanning every pack', () => {
    expect(validateView(spec)).toMatchObject({ valid: true, errors: [] });
  });

  it('exposes a zod schema covering the charts and diagrams packs', () => {
    expect(getViewSpecSchema().safeParse(spec).success).toBe(true);
  });

  // The charts pack's `donut` and the diagrams pack's `graph` reaching the
  // output is the assertion that matters: a components-pack-only runtime cannot
  // draw either.
  it('renders the non-React surfaces, charts and diagrams included', () => {
    expect(renderText(spec)).toContain('CLUSTER HEALTH');
    expect(renderText(spec)).toContain('Errors: 4');
    expect(renderText(spec)).toContain('hot-tier');
    expect(renderMarkdown(spec)).toContain('Cluster health');
  });

  it('inlines Distillate CSS into the HTML surface', () => {
    const { css, html } = renderHTML(spec, { css: 'inline' });
    expect(css).toContain('.aui{');
    expect(html).toContain('<style>');
  });

  it('defines a pack via /sdk, composes it via /compose, and renders it', () => {
    interface KbnHostNoteNode extends PrimitiveNode {
      type: 'kbnHostNote';
      text: string;
    }

    const hostNote = definePrimitive<KbnHostNoteNode, unknown>({
      type: 'kbnHostNote',
      catalog: {
        type: 'kbnHostNote',
        purpose: 'Throwaway host-private note for composition tests.',
        useWhen: ['A Kibana pack needs a unique type to compose.'],
        avoidWhen: ['The official vocabulary already covers the case.'],
        example: { type: 'kbnHostNote', text: 'Hello' },
      },
      examples: [{ type: 'kbnHostNote', text: 'Hello' }],
      schema: z.object({
        type: z.literal('kbnHostNote'),
        text: z.string().min(1),
      }),
      renderers: {
        react: (node) => createElement('span', null, node.text),
        text: (node) => node.text,
        markdown: (node) => node.text,
      },
    });
    const hostNotePack = definePrimitivePack({
      id: 'test.kbn-host-note',
      surfaces: [],
      primitives: [hostNote],
    });
    const runtime = createKibanaRuntime({ extraPacks: [hostNotePack] });
    const extraSpec = {
      type: 'view' as const,
      body: [{ type: 'kbnHostNote' as const, text: 'composed' }],
    };

    expect(renderText(extraSpec, { runtime })).toBe('composed');
  });
});
