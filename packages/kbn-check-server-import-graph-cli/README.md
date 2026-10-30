# @kbn/check-server-import-graph-cli

Static check that browser-only node modules (`@elastic/eui`, `react-intl`, `react-use`, `redux`, ...) are not reachable from the Kibana server's import graph.

```sh
node scripts/check_server_import_graph                   # check against baseline.json
node scripts/check_server_import_graph --update-baseline # rewrite baseline.json
```

It also runs as part of `node scripts/check` and as a CI quick check.

## What it does

1. Starts from every plugin `server/index.ts` (plugins with `plugin.server: true`) plus `@kbn/core/server`.
2. Walks the import graph breadth-first, following every import that can load code: value `import`/`export ... from`, literal `require()`, and literal dynamic `import()`. `import type`, `export type` and all-`type` specifier lists are skipped because the compiler elides them.
3. Stops at node modules and records every reachable source file that imports one of the banned modules (see `src/banned_packages.ts`), together with the shortest chain of imports from an entry point.
4. Compares the result with `baseline.json` and fails on either direction of drift: a new violation, or a baseline entry that is no longer a violation.

The whole repo (~25k reachable files) takes about ten seconds.

## Why a graph check and not a lint rule

The import that pulls a browser library onto the server is almost never in a `server/` file. It sits in a `common/` directory or a shared package barrel that a server file happens to import. A per-file lint rule cannot see that, and a lint rule that followed imports transitively would be unsound under per-file lint caching and would report the error on a file the offending PR never touched.

## Why dynamic `import()` is followed

Plugin `server/index.ts` files load their plugin class with `await import('./plugin')` at startup, so treating `import()` as lazy would hide most of every plugin. More generally, whether a lazy import runs at startup is a runtime property that static analysis cannot see, and server code has no business loading these packages even lazily. The runtime gate (`scripts/check_server_module_graph`) is the complement for things that genuinely depend on runtime behaviour.

## Fixing a violation

The reported chain starts at a server entry point and ends at the file that imports the browser-only module. The fix is almost always in the middle: a barrel (`common/index.ts`, a package `index.ts`) that re-exports both pure and browser-only code. Move the browser-only code into its own module that only browser code imports, or give the server a pure subpath to import. Rebuilding browser values from theme tokens on the server is rarely the right answer.

Once fixed, run `--update-baseline` so the entry is removed; the check fails on stale entries so the baseline only shrinks.
