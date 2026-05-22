/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChunkPreloadManifestPlugin } from './chunk_preload_manifest_plugin';

const createMockChunk = (
  files: string[],
  idNameHints: string[] = []
): { files: Set<string>; idNameHints: Set<string> } => ({
  files: new Set(files),
  idNameHints: new Set(idNameHints),
});

const createMockCompiler = (opts: {
  cacheGroups?: Record<string, { name?: string }>;
  chunks: Array<{ files: Set<string>; idNameHints: Set<string> }>;
  entrypoints?: Map<string, { childrenIterable: Array<{ chunks: typeof opts.chunks }> }>;
}) => {
  let processAssetsFn: () => void;
  const emittedAssets: Array<{ name: string; source: string }> = [];

  const compilation = {
    hooks: {
      processAssets: {
        tap: (_opts: any, fn: () => void) => {
          processAssetsFn = fn;
        },
      },
    },
    chunks: new Set(opts.chunks),
    entrypoints: opts.entrypoints ?? new Map(),
    emitAsset: (name: string, source: { source: () => string }) => {
      emittedAssets.push({ name, source: source.source() });
    },
  };

  const compiler = {
    options: {
      optimization: {
        splitChunks: {
          cacheGroups: opts.cacheGroups ?? {},
        },
      },
    },
    hooks: {
      compilation: {
        tap: (_name: string, fn: (comp: typeof compilation) => void) => {
          fn(compilation);
        },
      },
    },
  };

  return {
    compiler,
    runProcessAssets: () => processAssetsFn(),
    getEmittedAssets: () => emittedAssets,
  };
};

describe('ChunkPreloadManifestPlugin', () => {
  it('classifies named shared chunks based on cacheGroup keys', () => {
    const sharedChunk = createMockChunk(['shared.js'], ['vendorShared']);
    const pluginChunk = createMockChunk(['plugin.js'], ['other']);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { vendorShared: { name: 'vendor-shared' } },
      chunks: [sharedChunk, pluginChunk],
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const manifest = JSON.parse(getEmittedAssets()[0].source);
    expect(manifest.allChunks).toContain('shared.js');
  });

  it('includes all async chunks from kibana entrypoint children in allChunks', () => {
    const sharedChunk = createMockChunk(['shared.js'], ['vendor']);
    const asyncChunk = createMockChunk(['async-plugin.js']);

    const entrypoints = new Map([
      [
        'kibana',
        {
          childrenIterable: [{ chunks: [asyncChunk] }],
        },
      ],
    ]);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { vendor: { name: 'vendor' } },
      chunks: [sharedChunk, asyncChunk],
      entrypoints,
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const manifest = JSON.parse(getEmittedAssets()[0].source);
    expect(manifest.allChunks).toContain('shared.js');
    expect(manifest.allChunks).toContain('async-plugin.js');
  });

  it('deduplicates shared chunks in allChunks', () => {
    const sharedChunk = createMockChunk(['shared.js'], ['vendor']);

    const entrypoints = new Map([
      [
        'kibana',
        {
          childrenIterable: [{ chunks: [sharedChunk] }],
        },
      ],
    ]);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { vendor: { name: 'vendor' } },
      chunks: [sharedChunk],
      entrypoints,
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const manifest = JSON.parse(getEmittedAssets()[0].source);
    const sharedJsCount = manifest.allChunks.filter((f: string) => f === 'shared.js').length;
    expect(sharedJsCount).toBe(1);
  });

  it('only collects .js files (excludes .css, .map)', () => {
    const chunk = createMockChunk(['bundle.js', 'bundle.css', 'bundle.js.map'], ['vendor']);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { vendor: { name: 'vendor' } },
      chunks: [chunk],
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const manifest = JSON.parse(getEmittedAssets()[0].source);
    expect(manifest.allChunks).toEqual(['bundle.js']);
  });

  it('sorts files alphabetically', () => {
    const chunkA = createMockChunk(['z-shared.js'], ['groupA']);
    const chunkB = createMockChunk(['a-shared.js'], ['groupB']);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { groupA: { name: 'z' }, groupB: { name: 'a' } },
      chunks: [chunkA, chunkB],
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const manifest = JSON.parse(getEmittedAssets()[0].source);
    expect(manifest.allChunks).toEqual(['a-shared.js', 'z-shared.js']);
  });

  it('emits valid JSON with { allChunks } shape', () => {
    const chunk = createMockChunk(['test.js'], ['group']);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { group: { name: 'test' } },
      chunks: [chunk],
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const emitted = getEmittedAssets();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe('chunk-manifest.json');
    const manifest = JSON.parse(emitted[0].source);
    expect(manifest).not.toHaveProperty('sharedChunks');
    expect(manifest).toHaveProperty('allChunks');
  });

  it('includes named shared chunks in allChunks when there is no kibana entrypoint', () => {
    const sharedChunk = createMockChunk(['shared.js'], ['vendor']);

    const { compiler, runProcessAssets, getEmittedAssets } = createMockCompiler({
      cacheGroups: { vendor: { name: 'vendor' } },
      chunks: [sharedChunk],
    });

    const plugin = new ChunkPreloadManifestPlugin();
    plugin.apply(compiler as any);
    runProcessAssets();

    const manifest = JSON.parse(getEmittedAssets()[0].source);
    expect(manifest.allChunks).toEqual(['shared.js']);
  });
});
