import { type Compiler } from '@rspack/core';
/**
 * Elastic License 2.0 banner for x-pack plugin bundles.
 *
 * This is the exact text the legacy webpack optimizer prepends to every output
 * chunk of x-pack plugin compilations via `webpack.BannerPlugin({ raw: true })`.
 * The `/*!` prefix ensures the comment survives minification (both SWC and
 * Terser preserve `/*!` comments by default).
 *
 * This is intentionally NOT the same as the triple-license source file header
 * (`TRIPLE_ELV2_SSPL1_AGPL3_LICENSE_HEADER` in `.eslintrc.js`) or the
 * multi-line `ELV2_LICENSE_HEADER` — those are for source files and have
 * different formatting and, in the triple case, different license scope.
 */
export declare const XPACK_ELASTIC_LICENSE_BANNER: string;
/**
 * Rspack plugin that selectively prepends the Elastic License 2.0 banner
 * to x-pack plugin chunks in the single compilation.
 *
 * The legacy webpack optimizer ran one compilation per plugin and used
 * `webpack.BannerPlugin` on each x-pack compilation. The rspack optimizer
 * uses a single compilation for all plugins, so this plugin identifies
 * x-pack chunks by their **chunk name** (e.g., `plugin-discover`) — stable
 * regardless of output filename hashing — and prepends the banner only to
 * those chunks' `.js` assets.
 *
 * X-pack detection uses the same directory-prefix heuristic as the legacy
 * optimizer: plugins whose `contextDir` lives under `<repoRoot>/x-pack/`
 * are considered x-pack plugins.
 *
 * CSS is injected via `style-loader` (not extracted to files), so only
 * `.js` files need bannering. Shared vendor/split chunks contain third-party
 * code and are excluded.
 */
export declare class XPackBannerPlugin {
    private readonly xpackChunkNames;
    constructor(repoRoot: string, plugins: ReadonlyArray<{
        id: string;
        contextDir: string;
    }>);
    apply(compiler: Compiler): void;
}
