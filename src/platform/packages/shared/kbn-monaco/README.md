# @kbn/monaco

`@kbn/monaco` configures Kibana's shared [Monaco Editor](https://microsoft.github.io/monaco-editor/)
runtime: editor features, language support, syntax themes, and web workers. It is shared across
plugins through `@kbn/ui-shared-deps-npm` / `@kbn/ui-shared-deps-src` so they use one configured copy.

Consumers import from the **root of `@kbn/code-editor`**, which provides the React editor,
accessibility behaviour, and EUI theme lifecycle. Only that package and `@kbn/monaco` itself should
import `@kbn/monaco` directly. `@kbn/imports/no_direct_monaco_import` warns on violations; if a symbol
is missing, export it from `@kbn/code-editor`'s index.

## How it works

Importing the browser entry:

1. Loads the editor contributions and upstream language registrations in `src/monaco_imports.ts`.
2. Installs `monaco.editor.registerLanguageThemeResolver` / `getLanguageThemeResolver` and the
   token-matching patch used for language-scoped syntax colours.
3. Sets `window.MonacoEnvironment` to create workers through `getWorker`.

`@kbn/code-editor` calls `initializeSupportedLanguages()` at module scope to register Kibana's
language definitions. `registerLanguage` registers the language and theme resolver immediately,
then installs its tokenizer, configuration, folding provider, and `onLanguage` hook on first use.
This defers setup; deferring code loading also requires a dynamic `import()`.

Monaco's active theme is global. Kibana namespaces custom token rules by language and includes them
in every theme it defines, preventing one language's syntax colours from affecting another.
Editor backgrounds and widget colours still follow the global theme.

## File map

| Path | Responsibility |
| --- | --- |
| `index.ts`, `src/register_globals.ts` | Browser exports, runtime globals, and Monaco type augmentations. |
| `src/monaco_imports.ts` | Curated editor contributions and shared Monaco imports. |
| `src/languages/definitions/index.ts` | Language exports and `initializeSupportedLanguages` registry. |
| `src/languages/helpers.ts` | Language registration and cancellation helper. |
| `src/languages/theming/` | Theme API, token scoping, and EUI palette. |
| `src/languages/worker_factory.ts`, `webpack.config.js` | Worker routing and bundle entries. |
| `server.ts` | Worker bundle directory for the server to serve. |

## Adding a language

1. Export a `LangModuleType` from `src/languages/definitions/<lang>/` with its `ID` and optional
   `lexerRules`, `languageConfiguration`, `foldingRangeProvider`, `languageThemeResolver`, and
   `onLanguage` hook. Use `CustomLangModuleType` when exposing provider factories and validation.
2. Export the definition and language id from `src/languages/definitions/index.ts`, and add the
   definition to its `initializeSupportedLanguages` list.
3. Wire completion, hover, and other providers through the corresponding `CodeEditor` props;
   wire validation explicitly. `registerLanguage` does not install these from the module's
   provider factories or `validate` method.
4. If it needs a dedicated worker, add both the worker entry and routing id (see [Workers](#workers)).

Monarch normally appends `.<languageId>` to token names. Some languages use `tokenPostfix: ''`,
so inspect the actual tokenizer output when authoring theme rules. Inlined rules use the host
language's postfix; languages entered through `nextEmbedded` retain their own tokenization.

Use `handleInterruptibleMonacoOperation` for cancellable provider work. It rejects with Monaco's
`CancellationError` when cancelled; it does not stop the underlying operation.

## Theming

`src/languages/theming/index.ts` patches `TokenTheme.prototype.match` to prefix tokens with the
language id for languages with a registered resolver. For example, `variable` becomes
`esql.variable` at lookup. Token colours are associated with models, which can be shared by editors,
so this isolates syntax colours by language rather than by editor.

- Set `languageThemeResolver` on the language definition to opt into scoping. Author rules using
  the tokenizer's original token names; the package adds the namespace.
- `initializeRegisteredLanguagesTheme(euiTheme)` seeds each namespace with the shared EUI palette,
  then applies the language's overrides, and registers the result into both Kibana themes
  (`codeEditorDefaultTheme`, `codeEditorTransparentTheme`). No language-named theme ids are
  registered; use this initializer instead of defining themes directly.
- Theme `rules` are scoped; `colors` (backgrounds, widgets, etc.) remain global.
  `@kbn/code-editor` reruns the initializer when the EUI theme changes.
- The `defaultThemesResolvers` builders are memoised per palette, so a light → dark → light
  round-trip never recomputes a theme. The initializer is a no-op while Monaco already holds themes
  for the current palette — every mount after the first — which avoids Monaco's theme refresh
  (stylesheet regeneration and re-tokenising every model) per mount. A mode switch does
  re-register, necessarily: Monaco keeps one theme per id. The palette key is `colorMode`,
  `highContrastMode` and a fingerprint of two computed colours — not object identity (EUI issues a
  new theme object per mode change) and not mode alone: on a live switch `useEuiTheme()` has one
  render where `colorMode` has flipped but the computed colours haven't. That render still
  registers a mismatched theme momentarily; the point of the design is that the consistent render
  right after it is never mistaken for a repeat and always overwrites it. Builders return a shared
  object: spread it before changing anything.
- Language ids matching `/\b(comment|string|regex|regexp)\b/` are rejected for scoping because
  Monaco derives token types from these words in the token string.

The theming module imports Monaco directly to avoid a cycle with `monaco_imports.ts`, which
re-exports its API. Prefer the centralized imports for browser contributions; workers and isolated
internal adapters also have direct imports where needed.

## Workers

`webpack.config.js` emits `target_workers/<id>.editor.worker.js`.
`src/languages/worker_factory.ts` selects the language's worker or falls back to
`editorWorkerService`.

**Keep the webpack entry list and `langSpecificWorkerIds` in sync**, including the generic worker
in webpack. A missing entry causes a runtime 404; an unused entry ships a redundant bundle.
Custom worker entry files live at `src/languages/definitions/<lang>/worker/<lang>.worker.ts` and
import Monaco's worker runtime directly.

The moon `build-webpack` task produces the bundles. At runtime their base URL comes from
`window.__kbnPublicPath__['kbn-monaco']`; `server.ts` prefers local `target_workers/` over the
built distribution. `target_workers/` is gitignored.

## Upgrading Monaco

- Check the curated contribution list and import paths against the new version. Missing
  contributions can silently disable features or cause `depends on UNKNOWN service` errors.
- Recheck worker builds and third-party compatibility aliases in `webpack.config.js`.
- Verify the internal APIs below and their declarations in `src/typings.d.ts`; a passing build
  does not establish runtime compatibility.

| Internal | Behaviour to verify |
| --- | --- |
| `TokenTheme.prototype.match` and Monarch token postfixes | Language-scoped syntax colours; the import-time guard only checks the match function's shape. |
| `HoverParticipantRegistry` | Hover customisation. |
| `MenuRegistry` / `MenuId.EditorContext` | Translated clipboard actions. |
| `StandaloneServices` / `IUndoRedoService` | Custom undo/redo integration. |

## Development

The key runtime suites are `src/languages/theming/index.test.ts` (syntax colour isolation),
`src/monaco_imports.test.ts` (theme API installation), and `src/register_globals.test.ts`
(worker environment). The theming tests compare rendered token classes across themes and check
that tokens retain distinct colours.

**Browser changes need a shared-deps rebuild.** `@kbn/monaco` ships inside the
`kbn-ui-shared-deps-src` bundle, which the dev server does *not* rebuild when sources change — plugin
HMR will report "Updated" while the page keeps running the old `@kbn/monaco`. After editing this
package, rebuild it and hard-reload:

```bash
pnpm --filter @kbn/ui-shared-deps-src run build
```

```bash
# Unit tests
node scripts/jest src/platform/packages/shared/kbn-monaco

# Scoped type check
node scripts/type_check --project src/platform/packages/shared/kbn-monaco/tsconfig.json

# Regenerate the Painless ANTLR parser (requires Homebrew; runs brew bundle)
pnpm --filter @kbn/monaco build:antlr4
```
