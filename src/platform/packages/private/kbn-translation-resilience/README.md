# @kbn/translation-resilience

Browser page translation in Chrome and Edge wraps text nodes in `<font>` tags and moves them. React then throws `Failed to execute 'removeChild' on 'Node'`, and parts of the UI, including dashboards, stop responding.

This package is the opt-in workaround. It builds [`translation-resilience`](https://github.com/alexspeller/translation-resilience) into a standalone script that patches `Node.prototype` so displaced text nodes are re-adopted instead of throwing. The patch stays idle until the browser actually translates the page (`eager: false`).

The script is not part of Kibana's Rspack compilation and not part of `kbn-ui-shared-deps-src.js`. Those bundles download on every page load. This one downloads only for a user who turned on **Browser translation compatibility**.

## Why a separate Webpack bundle

The patch has to run before React evaluates. React lives in `kbn-ui-shared-deps-npm.dll.js`, which is the first shared-deps script. An Rspack chunk cannot go there: those chunks are JSONP payloads for `kibana.bundle.js`, they are requested for every page, and they run after the shared-deps scripts.

A static `require('translation-resilience')` inside `kbn-ui-shared-deps-src` would also run too late to stay off the default download. Webpack still emits a static `require` into that file, which is on every page load (about 14 kB).

So this package is built like the Monaco workers and `@kbn/vega-sandbox`: `webpack.config.js` uses `target: 'web'`, no shared-deps externals, and a stable filename. Nothing else in Kibana should import `translation-resilience`. A normal import puts the library back into a bundle every page downloads.

## How it is loaded

The choice is stored on the user profile (`userSettings.installTranslationResilience`) and defaults to off. On a self-managed deployment the switch is in the profile Language section. On Elastic Cloud and serverless it is in the user-menu Language modal. The rendering service writes the boolean into a `<kbn-translation-resilience>` element. The bootstrap script reads that element and sets `window.__kbnInstallTranslationResilience__` before it loads any bundle.

When the flag is true, `render_template.ts` prepends this script to the load list. `load()` inserts every script with `async = false`, so they download together and execute in order. This file is first, then the npm shared-deps bundle that evaluates React.

```
src/bootstrap.ts
        │  webpack (package "build" script)
        ▼
target_translation_resilience/translation_resilience.js
        │  server.ts exports bundleDir
        ▼
Core register_bundle_routes.ts
        │  GET /bundles/kbn-translation-resilience/*
        ▼
Bootstrap script (render_template.ts), only if the user opted in
        │  unshift the URL, then load the shared-deps scripts
        ▼
bootstrap.ts calls installTranslationResilience({ eager: false })
```

`onEvent` forwards the library's messages to `window.__kbnTranslationsTelemetryEmitter__`. The i18n service registers that function during setup, after the script has loaded, and reports them as the `translation-resilience` EBT event. The callback checks for the function when an event fires, so installing the patch before setup is safe.

Turning the switch off and reloading leaves the script out of the load list. The patch is not installed.

### `server.ts`

Node-only. The HTTP server asks which directory to serve at `/bundles/kbn-translation-resilience/`.

```ts
export const bundleDir = Fs.existsSync(localBundleDir) ? localBundleDir : builtBundleDir;
```

- Dev: `scripts/build_package.js` writes `target/build/src/platform/packages/private/kbn-translation-resilience/target_translation_resilience/`. A `target_translation_resilience/` directory next to this package wins if it exists.
- Dist: `build_packages_task.ts` copies that folder into the package inside the distributable, and `create_cdn_assets_task.ts` copies it to `bundles/kbn-translation-resilience`.

`register_bundle_routes.ts` imports `bundleDir` from `@kbn/translation-resilience/server`. Browser code never imports `server.ts`.

### `index.ts`

Constants the bootstrap renderer imports (`@kbn/translation-resilience`): the bundle directory name and `translation_resilience.js`. It does not install the patch.
