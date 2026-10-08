# @kbn/monaco

Kibana's curated build of [Monaco Editor](https://microsoft.github.io/monaco-editor/). It decides
which Monaco features ship, registers Kibana's own languages, owns editor theming, and builds the
web worker bundles. Importing it configures Monaco as a side effect — see
[Import side effects](#import-side-effects).

Monaco is a large, global-by-design dependency, so this package exists to keep exactly one
configured copy in the browser. It is shared with every plugin through `@kbn/ui-shared-deps-npm` /
`@kbn/ui-shared-deps-src`.

## Who should import what


| You are                                    | Import                            |
| ------------------------------------------ | --------------------------------- |
| A plugin or package that wants an editor   | `@kbn/code-editor`, **root only** |
| `@kbn/code-editor` itself, or this package | `@kbn/monaco`                     |


`@kbn/imports/no_direct_monaco_import` enforces this (as a warning). If a symbol you need isn't
exported from `@kbn/code-editor`, add it to that package's index rather than reaching past it.
`@kbn/code-editor` owns the React component, the theme lifecycle and the accessibility affordances;
bypassing it gets you a bare Monaco with none of that.

## Module layout


| Path                              | What lives there                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `index.ts`                        | Public entry. Also imports `src/register_globals` for its side effects.                                 |
| `server.ts`                       | Resolves the worker bundle directory for the server to serve.                                           |
| `src/monaco_imports.ts`           | The curated list of Monaco contributions that ship, and the single funnel re-exporting the theming API. |
| `src/register_globals.ts`         | `window.MonacoEnvironment`, and the TypeScript augmentation of the `monaco.editor` namespace.           |
| `src/languages/helpers.ts`        | `registerLanguage`, `handleInterruptibleMonacoOperation`.                                               |
| `src/languages/definitions/`      | One directory per language. `definitions/index.ts` is the registry.                                     |
| `src/languages/theming/`          | Everything theming — see below.                                                                         |
| `src/languages/worker_factory.ts` | Maps a language id to its worker bundle URL.                                                            |
| `src/common/`                     | Shared helpers: worker proxy, diagnostics adapter, error listener, base lexer rules.                    |
| `src/ace_migration/`              | Worker-backed annotation plumbing from the Ace era, still used by xjson.                                |
| `src/__jest__/`                   | Jest mocks for `monaco_imports`.                                                                        |
| `webpack.config.js`               | Builds the worker bundles into `target_workers/` (gitignored).                                          |
| `scripts/`                        | ANTLR and autocomplete-definition generators (Painless, ES\|QL).                                        |

Theming sits under `src/languages/` because it is a property of languages, not of editors — see
[Theming](#theming):

| Path                               | What lives there                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `src/languages/theming/index.ts`   | The `monaco.editor` theme API, language scoping, and theme registration.              |
| `src/languages/theming/theme.ts`   | The shared Kibana palette, built from the EUI theme.                                  |
| `src/languages/theming/helpers.ts` | `themeRuleGroupBuilderFactory`, for languages that build rules in groups.             |
| `src/languages/theming/constants.ts` | The two default theme ids.                                                          |




## Import side effects

`import '@kbn/monaco'` is not inert. Loading the package:

1. Pulls in every contribution listed in `src/monaco_imports.ts` (folding, suggest, hover, find,
  clipboard actions, …). **Anything not imported there does not exist at runtime.** A missing
   contribution usually shows up as a feature silently doing nothing, or as a
   `depends on UNKNOWN service` error.
2. Loads `src/languages/theming/index.ts` (via `monaco_imports`), which adds
  `registerLanguageThemeResolver` / `getLanguageThemeResolver` to `monaco.editor` and installs the
   `TokenTheme.prototype.match` patch that makes theming language-scoped (see [Theming](#theming)).
3. Sets `window.MonacoEnvironment` so Monaco resolves workers through `getWorker`.

Step 2 is why the theming module imports `monaco-editor/editor/editor.api.js` directly instead of
going through `monaco_imports`: `monaco_imports` re-exports the theming API, so routing the import
back through it would be a cycle.

Languages are *not* registered by importing the package. `@kbn/code-editor` calls
`initializeSupportedLanguages()` at module scope; call it yourself only if you are not going through
that package.

## Adding a language

A language is an object satisfying `LangModuleType` (or `CustomLangModuleType` when it also provides
completion/hover/validation), exported from `src/languages/definitions/<lang>/`:

```ts
export const MyLang: LangModuleType = {
  ID,                       // the Monaco language id
  lexerRules,               // IMonarchLanguage
  languageConfiguration,    // brackets, comments, auto-closing pairs
  foldingRangeProvider,
  languageThemeResolver,    // optional — see Theming
  onLanguage: async () => { /* lazy: runs the first time the language is used */ },
};
```

Register it in `src/languages/definitions/index.ts` (both the exports and the
`initializeSupportedLanguages` list). `registerLanguage` wires the rest up, deferring everything
inside `onLanguage` until Monaco actually needs the language, which keeps the initial bundle small.

Two things worth knowing before you write Monarch rules:

- **Monarch appends a token postfix.** It defaults to `.<languageId>`, so a rule emitting `keyword`
produces `keyword.esql`. Several Kibana languages set `tokenPostfix: ''` (xjson, sql, hjson,
handlebars) and therefore emit bare, highly collidable token names.
- **Nested languages.** Console inlines xjson/SQL/Painless/ES|QL rule builders rather than embedding
them as separate languages, so those tokens carry Console's postfix. Embedded languages entered
via `nextEmbedded` keep their own.



## Workers

Monaco runs language services in web workers. This package builds them itself.

- `webpack.config.js` has an explicit entry list, emitting `target_workers/<id>.editor.worker.js`.
- `src/languages/worker_factory.ts` maps a language id to a bundle, falling back to the generic
`editorWorkerService` worker for languages without one.
- **The entry list in** `webpack.config.js` **and** `langSpecificWorkerIds` **in** `worker_factory.ts` **must
stay in sync.** Adding one without the other yields either a dead bundle or a 404 at runtime.
- Worker entry files (`<lang>/worker/<lang>.worker.ts`) run outside the main bundle. They import
Monaco's worker runtime directly and are exempt from the usual module rules.
- `target_workers/` is gitignored and produced by the moon `build-webpack` task. At runtime the URL
comes from `window.__kbnPublicPath__['kbn-monaco']`; `server.ts` prefers a local build over the
distributable one.



## Theming

This is the subtlest part of the package. **Monaco applies one theme to the entire page.**
`IStandaloneEditorConstructionOptions.theme` looks like per-editor state but is a direct call to
`IStandaloneThemeService.setTheme`, so whichever editor mounts last would otherwise dictate colours
for every editor on the page ([monaco-editor#1289](https://github.com/microsoft/monaco-editor/issues/1289),
open since 2019).

Per-editor isolation is not expressible: token colours are resolved during tokenization and cached
on the *model*, and Monaco lets several editors share one model. The granularity Monaco *can*
express is the language, because `TokenTheme.match(languageId, token)` receives it.

So `src/languages/theming/index.ts` prefixes a token with its language before the theme's trie
lookup, and `initializeCodeEditorThemes` gives every registered theme one rule set containing the shared
rules plus one namespace per language (`esql.variable`, `console.method`, …). A language's rules can
then only ever colour its own tokens.

That one module is the whole theming surface — the `monaco.editor` theme API, the scoping patch and
theme registration all live there, because they only make sense together. It also owns the types:
`KbnMonacoThemingLanguageThemeResolver` is what `LangModuleType.languageThemeResolver` is typed as,
and `register_globals.ts` declares the two `monaco.editor` functions to TypeScript using the
`KbnMonacoTheming` interface. The runtime values are installed by the theming module itself.

What this means when you touch theming:

- **Registering a** `languageThemeResolver` **opts the language into scoping.** There is no separate
call. Rules stay authored exactly as before — the prefix is applied at registration.
- **A scoped language no longer inherits shared rules by prefix matching.** `esql.string` does not
match a `string` rule, so `initializeCodeEditorThemes` seeds each namespace with the shared palette
first and lets the language override it.
- `rules` **are scoped;** `colors` **are not.** Theme `colors` are editor chrome — backgrounds, the
suggest widget — which Monaco only expresses globally. They still follow the active theme.
- **Call** `initializeCodeEditorThemes(euiTheme)`**, don't hand-roll the loop.** It is the only place that
knows the namespacing rules.
- A language id containing `comment`, `string`, `regex` or `regexp` is rejected: Monaco derives
`StandardTokenType` by regexing the token string, so such a prefix would mis-classify every token
in that language.

`src/languages/theming/index.test.ts` asserts each language renders identically whichever theme is active. It
uses `monaco.editor.colorize` and compares the emitted `mtk*` classes, which is the most direct way
to test colour resolution without a DOM editor. If you change anything in this area, check the test
still fails when you undo your change — it is easy to write a theming assertion that passes because
everything collapsed to one colour.

## Monaco internals this package depends on

These are not public API. Each is load-bearing, and each is a thing to re-verify on upgrade.


| Internal                                        | Used for                                         | Symptom if it changes              |
| ----------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| `TokenTheme.prototype.match(languageId, token)` | Language-scoped theming (`src/languages/theming/`) | Guarded — throws at import time  |
| `MonarchTokenizer` token postfix behaviour      | Theme rule naming                                | Wrong or missing token colours     |
| `HoverParticipantRegistry`                      | Hover customisation                              | Hover behaviour regressions        |
| `MenuRegistry` / `MenuId.EditorContext`         | Translated clipboard context-menu actions        | Untranslated or missing menu items |
| `StandaloneServices` / `IUndoRedoService`       | `getUndoRedoService`                             | Undo/redo integration breaks       |


Deep internals are typed in `src/typings.d.ts`, since Monaco only ships declarations for its public
API.

## Upgrading monaco-editor

A checklist drawn from the 0.44 → 0.56 upgrade:

1. **Import specifiers move.** 0.56 added an `exports` map (`"./*": "./esm/vs/*.js"`), so
  `monaco-editor/esm/vs/...` became `monaco-editor/editor/...`. Third-party packages still using
   the old specifiers need a webpack alias — `webpack.config.js` has one for `monaco-worker-manager`
   and `monaco-yaml`.
2. **Re-verify every row in the table above**, not just that the build passes. Most of these fail
  silently.
3. Run the theming tests — they catch token-resolution changes that type checks cannot.
4. Check the contribution list in `src/monaco_imports.ts` against the new version; contributions get
  renamed and split.



## Conventions

- Deep `monaco-editor/...` imports need `/* eslint-disable @kbn/eslint/module_migration */`. Prefer
re-exporting from `src/monaco_imports.ts` so each internal has exactly one import site. The theming
module is the one exception, and only because routing back through `monaco_imports` would be a cycle.
- Give a language a theme by setting `languageThemeResolver` on its module, never by calling
`monaco.editor.defineTheme` yourself. A resolver is re-run whenever the EUI theme changes and opts
the language into scoping; a hand-defined theme gets neither.
- Long-running provider work should go through `handleInterruptibleMonacoOperation` so Monaco's
cancellation tokens are honoured.



## Development

The side-effectful parts are covered by three suites worth knowing about:
`src/languages/theming/index.test.ts` (colour resolution), `src/monaco_imports.test.ts` (the
`monaco.editor` theme API is installed), and `src/register_globals.test.ts`
(`window.MonacoEnvironment`). The last two `await import(...)` the module under test so the side
effects are observable per test file.

```bash
# unit tests
node scripts/jest src/platform/packages/shared/kbn-monaco

# type check
node scripts/type_check --project src/platform/packages/shared/kbn-monaco/tsconfig.json

# regenerate the Painless ANTLR parser (requires `brew bundle` from scripts/antlr4_tools)
pnpm --filter @kbn/monaco build:antlr4
```

