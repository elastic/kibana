# @kbn/rspack-optimizer

RSPack-based bundler for Kibana platform plugins. Builds core and all plugins in a single unified compilation using RSPack's Rust-based engine.

## Architecture

The optimizer uses a **unified single-compilation** model:

```
┌──────────────────────────────────────────────────────────────────┐
│                    UNIFIED COMPILATION                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Generated Entry (kibana-unified-entry.js)                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Phase 1 (sync):  Core                                      │ │
│  │  Phase 2 (async): All plugins via import()                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                         │                                         │
│                    RSPack builds                                  │
│                         │                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  target/public/bundles/                                      │ │
│  │  ├── kibana.bundle.js        (main entry + runtime)         │ │
│  │  └── chunks/                                                 │ │
│  │      ├── vendors-heavy.abc123.js   (maplibre, ace, etc.)    │ │
│  │      ├── 1a2b3c4d.js              (async plugin chunks)     │ │
│  │      └── ...                                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Externals (NOT bundled - served separately by webpack):         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  @kbn/ui-shared-deps-npm  (react, @elastic/eui, lodash...) │ │
│  │  @kbn/ui-shared-deps-src  (@kbn/i18n, @emotion/react...)   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### How it works

1. **Plugin discovery** scans known plugin directories and collects all plugins with a `public/index.{ts,tsx}` entry.

2. **Entry generation** creates `target/.rspack-entry-wrappers/kibana-unified-entry.js` which synchronously imports core and asynchronously imports all plugins via `import()`.

3. **Single RSPack invocation** compiles everything together. Shared dependencies (React, EUI, lodash, etc.) are **externalized** -- they are provided at runtime by `@kbn/ui-shared-deps-npm` and `@kbn/ui-shared-deps-src`, which are built separately by webpack and served as `<script>` tags before `kibana.bundle.js`.

4. **Chunk splitting** is handled automatically by RSPack's `splitChunks` configuration. Heavy vendor libraries (maplibre-gl, ace-builds, vega, etc.) are split into separate async chunks. Common code used by 3+ plugins is also extracted.

5. **Cache busting** is handled by Kibana's `shaDigest` path-based mechanism for all static assets, so output filenames do not need content hashes (except async chunks, which use `[contenthash:8]`).

### Externals

Shared dependencies are NOT bundled into `kibana.bundle.js`. They are externalized to `__kbnSharedDeps__` and `__kbnSharedDeps_npm__` globals, which are loaded from separately-built bundles. This avoids duplicating React, EUI, and other large libraries. The full list is in `src/config/externals.ts`.

## Usage

### CLI

```bash
# Full production build (minified, no source maps)
node scripts/build_rspack_bundles.js --dist

# Development with watch mode
node scripts/build_rspack_bundles.js --watch

# Or via environment variable (dev mode)
KBN_USE_RSPACK=true yarn start
```

### CLI Options

```
Build Options:
  --watch, -w               Enable watch mode for development
  --dist                    Build for distribution (minified, no source maps)
  --examples                Include example plugins
  --test-plugins            Include test plugins
  --themes <tags>           Comma-separated theme tags to build (default: all)
  --output-root <dir>       Output root directory (default: repo root)
  --no-cache                Disable filesystem caching
  --no-hmr                  Disable Hot Module Replacement in watch mode

Debugging:
  --no-inspect-workers      Don't forward --inspect to worker processes (default: forward)

Bundle Limits:
  --update-limits           Build in dist mode and update limits.yml (always full build)
  --validate-limits         Validate limits.yml against discovered plugins (no build)
  --limits <path>           Override limits.yml path (default: packages/kbn-rspack-optimizer/limits.yml)

limits.yml contains entries for both plugins and named shared chunks (shared-core,
shared-plugins, shared-packages, vendors, vendors-heavy, shared-misc, etc.).
Shared chunk entries are managed by --update-limits and tolerated by --validate-limits.
The set of tracked shared chunks is derived from getSplitChunksCacheGroups() in
src/config/split_chunks.ts -- no static list to maintain.

Profile Mode (one-time build with bundle analysis):
  --profile                 Full profiling with stats.json + RsDoctor report
  --profile-stats-only      Fast profiling with stats.json only (skips RsDoctor)
  --profile-focus <ids>     Comma-separated plugin IDs for focused stats.json with module detail
                            Note: --watch is ignored in profile mode
```

#### `--profile-focus` (focused profiling)

When profiling, the full stats for 200+ plugins can exceed memory limits if module-level detail is enabled. The `--profile-focus` flag runs a **full build** (all plugins are compiled, output is complete and working) but generates a **focused `stats.json`** scoped to specific plugins with full module-level detail:

```bash
# Profile only the dashboard plugin and its chunks
node scripts/build_rspack_bundles.js --profile --profile-focus=dashboard

# Profile multiple plugins
node scripts/build_rspack_bundles.js --profile-stats-only --profile-focus=dashboard,data,discover
```

Chunks are included if their name exactly matches `plugin-<id>`, or if they are shared chunks containing modules from the focused plugin's source directory. The focused stats include:
- Chunks belonging to the specified plugins (exact name match)
- Shared chunks containing modules originating from a focused plugin's directory
- All modules within matched chunks (deduplicated)
- Assets referenced by those chunks

Without `--profile-focus`, stats are generated with minimal detail (no module info) to avoid the JS string length limit.

#### `--inspect-workers`

By default, when the parent Node.js process is started with `--inspect` or `--inspect-brk`, the optimizer forwards the inspect flag to worker processes with an auto-incremented port. Use `--no-inspect-workers` to disable this:

```bash
# Workers will be inspectable at port 9230, 9231, etc.
node --inspect scripts/build_rspack_bundles.js

# Disable worker inspection
node --inspect scripts/build_rspack_bundles.js --no-inspect-workers
```

### Profiling

Generate bundle analysis data to identify optimization opportunities:

```bash
# Full profiling: stats.json + RsDoctor interactive report
node scripts/build_rspack_bundles.js --profile

# Quick profiling: stats.json only (faster, no RsDoctor)
node scripts/build_rspack_bundles.js --profile-stats-only

# Profile a production build
node scripts/build_rspack_bundles.js --dist --profile
```

After profiling, analyze the output:

- **stats.json**: Upload to [Statoscope](https://statoscope.tech/) or use `webpack-bundle-analyzer`
- **RsDoctor**: Opens an interactive report with build timing, module graph, and duplicate detection

Profiling runs in an isolated worker process with extra memory (8 GB) to handle the large stats output.

## Persistent Caching

The optimizer uses RSPack's persistent filesystem cache for fast rebuilds between restarts:

- **Cache location**: `node_modules/.cache/.rspack-cache/{dev|dist}/`
- **Separate caches**: Dev and dist builds use isolated cache directories to prevent stale cache issues
- **Invalidation**: Cache version includes a hash of all config files (`externals.ts`, `shared_config.ts`, etc.) so config changes automatically invalidate the cache
- **Disable**: Use `--no-cache` to skip caching entirely
- **Clear all**: `rm -rf node_modules/.cache/.rspack-cache`

## Watch Mode

In watch mode (`--watch`), the initial build shows full progress details. Subsequent rebuilds produce a single summary line:

```
succ  Rebuilt 211 entries in 2.3s (68.2 MB)
```

The `PluginWatchPlugin` monitors `kibana.jsonc` files and automatically regenerates the entry when plugins are added or removed.

## Production Optimizations

When building with `--dist`:

- **Minification**: SWC-based JS minification targeting ES2020 (safe per `.browserslistrc`)
- **Tree shaking**: `usedExports` + `sideEffects` for dead code elimination
- **Scope hoisting**: `concatenateModules` for smaller output
- **Deterministic IDs**: Stable module/chunk IDs for consistent caching
- **No source maps**: Omitted in production for smaller bundles

## External Plugin Builds

Third-party plugins are built using `kbn-plugin-helpers`, which uses a separate RSPack configuration (`createExternalPluginConfig`) that is independent of the unified internal build:

```bash
# Build an external plugin with RSPack
KBN_USE_RSPACK=true node /path/to/kibana/scripts/plugin_helpers build

# Or programmatically
import { createExternalPluginConfig } from '@kbn/rspack-optimizer';
```

External plugins do **not** use the unified `build_rspack_bundles.js` script — they have their own standalone compilation config that links against Kibana's shared dependencies (DLL bundles).

## Programmatic API

```typescript
import { runBuild } from '@kbn/rspack-optimizer';

const result = await runBuild({
  repoRoot: '/path/to/kibana',
  dist: true,
  watch: false,
});

if (result.success) {
  console.log('Build completed');
} else {
  console.error('Build failed:', result.errors);
}
```

### Key exports

| Export | Description |
|--------|-------------|
| `runBuild` | Run the unified RSPack build |
| `BuildOptions` | Options for `runBuild` |
| `BuildResult` | Result from `runBuild` (success, errors, close fn) |
| `runRspackCli` | CLI entry point |
| `RspackOptimizer` | Dev-mode optimizer class (used by `kbn-cli-dev-mode`) |
| `createSingleCompileConfig` | Generate RSPack config for unified build |
| `createExternalPluginConfig` | Generate RSPack config for external plugins |
| `getExternals` | Shared dependency externals mapping |
| `discoverPlugins` | Scan directories for Kibana plugins |
| `readLimits` | Read and parse limits.yml |
| `validateLimitsForAllBundles` | Validate limits.yml structure against discovered plugins |
| `updateBundleLimits` | Update limits.yml with current bundle sizes |
| `DEFAULT_LIMITS_PATH` | Default path to limits.yml |
| `getSplitChunksCacheGroups` | Cache groups config for splitChunks (single source of truth) |
| `getSharedChunkNames` | Set of named shared chunk names derived from cache groups |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `KBN_USE_RSPACK=true` | Use RSPack optimizer in dev mode instead of webpack |
| `KBN_HMR=false` | Disable HMR (RSPack only, alternative to `--no-hmr`) |
| `KBN_HMR_PORT=5678` | Override the HMR SSE server port (RSPack only, default: 5678) |

## Migration from @kbn/optimizer

1. No plugin code changes needed -- plugin source works as-is
2. Same output location -- `target/public/bundles/`
3. Same CI approach -- swap the build command

```bash
# Before (webpack)
node scripts/build_kibana_platform_plugins.js

# After (RSPack)
node scripts/build_rspack_bundles.js --dist
```
