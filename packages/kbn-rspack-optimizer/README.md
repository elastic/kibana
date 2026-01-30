# @kbn/rspack-optimizer

RSPack-based bundler for Kibana platform plugins with **optimal bundle sizes** and **isolated build support**.

## Key Features

- **Zero Code Duplication**: Shared deps (React, EUI, lodash) bundled ONCE
- **Tiny Plugin Bundles**: Plugins contain ONLY their own code (~50-100KB each)
- **Isolated Builds**: Rebuild ONE plugin without rebuilding everything
- **External Plugin Support**: Third-party plugins can be built separately
- **10-20x Faster**: RSPack's Rust-based compilation

## Architecture: Hybrid Mode (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: Shared Container (auto-discovered, smart-chunked)     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  kbn-shared/                                                 ││
│  │  ├── remoteEntry.js        (container entry)                ││
│  │  ├── shared-react.js       (~500 KB) ← React ecosystem      ││
│  │  ├── shared-elastic.js     (~1.5 MB) ← @elastic/*          ││
│  │  ├── shared-utils.js       (~500 KB) ← lodash, moment       ││
│  │  ├── shared-state.js       (~200 KB) ← rxjs, redux          ││
│  │  ├── shared-monaco.js      (~1 MB)   ← Monaco (lazy)        ││
│  │  ├── shared-kbn-core.js    (~300 KB) ← Core @kbn/*          ││
│  │  └── shared-kbn.js         (~500 KB) ← Other @kbn/*         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Phase 2: Plugin Bundles (externals → shared container)         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  dashboard  │ │  discover   │ │    maps     │  ...          │
│  │   ~50 KB    │ │   ~80 KB    │ │  ~120 KB    │               │
│  │ Only plugin │ │ Only plugin │ │ Only plugin │               │
│  │ code!       │ │ code!       │ │ code!       │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Discovery

Shared deps are **automatically discovered** by scanning plugin `package.json` files:

- **Core deps** always included (React, EUI, rxjs - defined as singletons)
- **Auto-discovered** packages used by 2+ plugins
- **@kbn/* packages** automatically included if widely used

### Smart Chunking

| Chunk | Contents | Cache Strategy |
|-------|----------|----------------|
| `shared-react` | React, Emotion | Long TTL (rarely changes) |
| `shared-elastic` | @elastic/eui, charts | Medium TTL |
| `shared-utils` | lodash, moment | Long TTL |
| `shared-state` | rxjs, redux | Long TTL |
| `shared-monaco` | Monaco editor | Lazy loaded |
| `shared-kbn-core` | @kbn/i18n, std | Short TTL (changes often) |
| `shared-kbn` | Other @kbn/* | Short TTL |

Benefits:
- **Parallel loading**: Browser loads chunks in parallel
- **Better caching**: React rarely changes, @kbn/* changes often
- **Lazy loading**: Monaco only loaded when needed

## Bundle Size Comparison

| Approach | Shared | dashboard | discover | Total |
|----------|--------|-----------|----------|-------|
| **Hybrid (this)** | 4 MB | 50 KB | 80 KB | ~4.3 MB |
| MF (no externals) | - | 1.5 MB | 1.8 MB | ~15+ MB |
| Webpack DLL | 3 MB | 60 KB | 90 KB | ~4.5 MB |

## Usage

### Full Build (Default)

```bash
# Build everything: shared container + all plugins
yarn build:rspack --dist

# Development with watch
yarn build:rspack --watch

# Or via environment variable
KBN_USE_RSPACK=true yarn start
```

### Isolated Plugin Build

Rebuild specific plugins WITHOUT rebuilding everything:

```bash
# Rebuild ONLY dashboard (requires prior full build)
yarn build:rspack --plugins=dashboard --dist

# Rebuild multiple plugins
yarn build:rspack --plugins=dashboard,discover,maps --dist
```

**Requirements:**
- Full build must exist first (creates shared container)
- Output is 100% compatible with existing bundles

**Use Cases:**
- PR only changed `discover` → `--plugins=discover` (5 seconds vs 60 seconds)
- Third-party plugin development
- Hot-swap plugins in development

### External Plugin Build

Third-party developers can build plugins:

```bash
# Build external plugin against Kibana's shared container
node /path/to/kibana/scripts/build_rspack_bundles.js \
  --plugins=my_custom_plugin \
  --dist
```

Output can be dropped into `kibana/plugins/` and works with any Kibana of the same major version.

## CLI Options

```bash
yarn build:rspack [options]

Options:
  --watch, -w           Watch mode for development
  --dist                Production build (minified)
  --plugins, -p <ids>   Build ONLY these plugins (isolated build)
  --focus <ids>         Include specific plugins in full build
  --filter <ids>        Exclude specific plugins
  --examples            Include example plugins
  --test-plugins        Include test plugins
  --single              Force single compilation (no isolated support)
  --legacy              Use legacy bundle-refs mode
  --no-cache            Disable filesystem caching
  --help, -h            Show help
```

## Shared Dependencies

The following are bundled ONCE in the shared container:

**Core (singletons):**
- react, react-dom
- @emotion/react, @emotion/cache
- rxjs, redux, react-redux, @reduxjs/toolkit
- moment, moment-timezone

**Elastic UI:**
- @elastic/eui, @elastic/charts
- @elastic/datemath, @elastic/numeral

**Utilities:**
- lodash, classnames, uuid, tslib
- history, query-string
- io-ts, fp-ts

**Kibana Packages:**
- @kbn/i18n, @kbn/i18n-react
- @kbn/es-query, @kbn/es-types
- @kbn/monaco, @kbn/code-editor
- @kbn/std, @kbn/utility-types
- ... and 30+ more

## Programmatic API

```typescript
import { runHybridBuild } from '@kbn/rspack-optimizer';

// Full build
const result = await runHybridBuild({
  repoRoot: '/path/to/kibana',
  dist: true,
});

// Isolated build
const result = await runHybridBuild({
  repoRoot: '/path/to/kibana',
  plugins: ['dashboard', 'discover'],
  dist: true,
});

console.log(result.pluginBundleSizes);
// { dashboard: 52000, discover: 81000 }
```

## Performance

| Operation | Time |
|-----------|------|
| Full build (cold) | ~60-90 seconds |
| Full build (cached) | ~30-45 seconds |
| Isolated build (1 plugin) | ~5-15 seconds |
| Watch rebuild | ~2-5 seconds |

## How It Works

1. **Shared Container** (`kbn-shared/remoteEntry.js`)
   - Built using Module Federation as a container
   - Exposes all shared dependencies
   - Loaded ONCE at runtime, shared by all plugins

2. **Plugin Bundles** (`{plugin}/remoteEntry.js`)
   - Built with externals pointing to shared container
   - Zero shared dependency code
   - MF remotes for cross-plugin imports

3. **Isolated Builds**
   - Reuse existing shared container
   - Only rebuild specified plugins
   - Output is drop-in compatible

## Extending Shared Dependencies

To add a new package to the shared container:

```typescript
// packages/kbn-rspack-optimizer/src/config/shared_deps.ts

export const UTIL_DEPS: SharedDep[] = [
  // ... existing
  { name: 'my-new-package', singleton: false },
];
```

Then run a full build to include it in the container.

## Migration from @kbn/optimizer

1. **No code changes needed** - Plugin code works as-is
2. **Same output location** - `target/public/bundles/`
3. **Same CI scripts** - Just change the build command

```bash
# Before
node scripts/build_kibana_platform_plugins.js

# After
node scripts/build_rspack_bundles.js --dist
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `KBN_USE_RSPACK=true` | Use RSPack optimizer in dev mode |
| `KBN_RSPACK_LEGACY=true` | Use legacy bundle-refs mode |
