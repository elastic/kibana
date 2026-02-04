# @kbn/transpile-packages-cli

CLI tool to transpile all Kibana packages from TypeScript to JavaScript using Vite 8 with Rolldown.

## Purpose

This tool pre-transpiles all Kibana packages to JavaScript, storing the output in a `.transpile-cache` directory. This approach can be used to:

- Speed up Kibana startup time by avoiding on-the-fly transpilation
- Create consistent pre-compiled output for both dev and production
- Enable native ESM module loading for server-side code

## Usage

```bash
# Transpile all packages
yarn transpile

# Clean cache and transpile all packages
yarn transpile --clean

# Force transpile (ignore cache)
yarn transpile --force

# Only transpile packages matching a pattern
yarn transpile --filter "@kbn/core-*"

# Verbose output
yarn transpile --verbose

# Control concurrency
yarn transpile --concurrency 8
```

## Options

| Option               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `--clean`            | Remove the cache directory before transpiling            |
| `--force`            | Force transpilation even if cache is valid               |
| `--filter <pattern>` | Filter packages by name pattern (e.g., `@kbn/core-*`)    |
| `--concurrency <n>`  | Number of packages to transpile in parallel (default: 4) |
| `--verbose`          | Show detailed output                                     |

## Output

The transpiled output is stored in `.transpile-cache/` at the repository root:

```
.transpile-cache/
├── manifest.json              # Cache metadata and file hashes
├── packages/
│   └── kbn-*/                 # Transpiled packages
├── src/
│   ├── core/packages/         # Core packages
│   └── platform/packages/     # Platform packages
└── x-pack/
    └── platform/packages/     # X-Pack packages
```

Each package output includes:

- `.js` files (ES modules)
- `.js.map` source maps

## Cache Invalidation

The cache is automatically invalidated when:

- Any TypeScript source file changes
- `tsconfig.json` changes
- `package.json` changes
- `kibana.jsonc` changes

## How It Works

1. **Discovery**: Uses `@kbn/repo-packages` to find all packages
2. **Hashing**: Calculates SHA-256 hash of all TypeScript files in each package
3. **Caching**: Compares hashes with manifest to skip unchanged packages
4. **Transpilation**: Uses Vite's build API with Rolldown for fast transpilation
5. **Post-processing**: Fixes ESM import paths to include `.js` extensions

## Architecture Notes

- Uses Vite 8 with Rolldown for fast Rust-based transpilation
- Outputs ES modules (not CommonJS) for native ESM support
- Preserves module structure (no bundling) for better debugging
- Externalizes all dependencies - only transpiles, doesn't bundle
- Generates source maps for debugging support
