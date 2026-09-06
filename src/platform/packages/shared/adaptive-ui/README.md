# @kbn/adaptive-ui

Vendored Kibana mirror of [`@elastic/adaptive-ui-host-kibana`](https://github.com/elastic/adaptive-ui-poc) — the batteries-included Kibana distribution of Adaptive UI. One package, whatever the upstream workspace splits into.

Upstream externalizes its siblings, so this package vendors the whole closure (the runtime, the SDK, Distillate, both theme packages, both primitive packs, the SVG engine, and the takumi generator) into `vendor/` and rewrites every cross-package `@elastic/*` specifier to a relative path inside it. That is what keeps Kibana at one package instead of one per upstream package.

## Entry points

- `@kbn/adaptive-ui` — isomorphic. Validation, `getViewSpecSchema`, the four non-React renderers, the view registry, and the spec types. Free of React and EUI, so a server plugin can import it.
- `@kbn/adaptive-ui/compose` — `createKibanaRuntime({ extraPacks, rendererOverrides })`. Appends host-private packs to `kibanaPacks`. Does not re-export the SDK.
- `@kbn/adaptive-ui/sdk` — pack-authoring toolkit: `definePrimitive`, `definePrimitivePack`, `extendPrimitivePack`, plus theme-token and Distillate style APIs. A pack imports `/sdk`, never `/compose`.
- `@kbn/adaptive-ui/react` — `KibanaAdaptiveView` and the mount adapter. Takes `surface: 'react' | 'html'`; `'html'` injects CSS-inlined markup into a shadow root. Optional `runtime` defaults to `getKibanaRuntime()`.
- `@kbn/adaptive-ui/node` — server only. `renderSVG` and `renderPNG`, drawn through the three-pack runtime so chart nodes rasterize. Defaults to takumi (`generator` / `pngRenderer`); import it lazily.
- `@kbn/adaptive-ui/builders` — spec builders for both packs, one import path. Constructs no runtime.
- `@kbn/adaptive-ui/syntax` — `codeBlock` and `diff` grammars. Registration is process-global.
- `@kbn/adaptive-ui/styles.css` — the theme stylesheet, for the `document` isolation mode.

Peers Kibana supplies: `react`, `react-dom`, `zod`, `@elastic/eui`, `@elastic/prismjs-esql`, `refractor`, `stylis`, `@takumi-rs/core`, `@takumi-rs/helpers`.

## Syncing

`vendor/`, `styles.css`, and the `.vendored_upstream.json` stamp are gitignored build output, so a fresh checkout ships none of it: type-checking, tests, and the `adaptiveUi` plugin will not work until you vendor once. Two steps:

```sh
# in the upstream repo (a detached worktree keeps the SHA pinned while main is mid-edit)
yarn build:packages

# in Kibana
node src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs --from /path/to/adaptive-ui-poc
```

The script throws on an `@elastic/adaptive-ui-*` package outside the closure, and on an `@elastic/*` subpath it cannot resolve against the closure's own `exports` maps, so a new upstream package or entry point surfaces at sync time rather than at runtime. An `@elastic/*` package that is not Adaptive UI is left alone — those are the peers above.

It also rewrites the one `import.meta` site upstream still emits — the SVG engine resolving its own location to find bundled fonts — which is a parse error once Kibana transpiles to CJS. See the comment on `rewriteImportMeta` in the script.

Declaration maps (`.d.ts.map`) are vendored with absolute `sources` into the upstream checkout, so go-to-definition from Kibana code reaches adaptive-ui `src/` when that repo is open in the same workspace. JS source maps are still omitted — dangling `sourceMappingURL` comments in vendored `.js` files break SWC at Kibana startup.

No upstream SHA is committed. Each run records the vendored revision in the gitignored `.vendored_upstream.json`, so which build is on disk is answered by the stamp, not by git.

`vendored_surface.test.ts` is the counterpart to upstream's `smoke:exports`: it renders a spec spanning both packs, so a missed specifier rewrite fails a test rather than Kibana startup.
