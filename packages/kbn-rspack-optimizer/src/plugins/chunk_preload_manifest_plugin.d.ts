import { type Compiler } from '@rspack/core';
/**
 * Emits `chunk-manifest.json` with a single field:
 *
 * - `allChunks`: ALL async chunks (named shared + plugin entries + unnamed).
 *   Used by `bootstrap_renderer.ts` to populate the bootstrap `load()` array,
 *   enabling eager parallel download of every chunk via `<script async=false>`
 *   before `kibana.bundle.js`. Rspack's JSONP mechanism queues module factories
 *   so that dynamic imports resolve without network requests once the runtime
 *   drains the queue.
 *
 * If CI or FTR shows ChunkLoadError / 404 on /bundles/chunks/, compare emitted assets to
 * chunk-manifest.json and validate script order vs Rspack chunk graph (alphabetical sort here
 * is for stability; change only with failing-log evidence).
 */
export declare class ChunkPreloadManifestPlugin {
    apply(compiler: Compiler): void;
}
