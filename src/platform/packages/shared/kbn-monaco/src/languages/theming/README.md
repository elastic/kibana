# Editor theming

How Kibana themes Monaco editors, and why it is done this way. Read this before changing anything
in this directory, in `@kbn/code-editor`'s theme handling, or in a consumer that wants an editor to
look different.

## TLDR;

- Monaco has **one active theme per page**. There is no per-editor theme, and nothing in this
  directory pretends otherwise.
- **Syntax colors** are scoped **per language**, inside that one theme. A language registers token
  `rules`; the module namespaces them so they can only ever color that language's tokens.
- **Editor chrome** (background, gutter, selection, suggest and hover widgets, diff decorations) is
  the Kibana default for every editor, and is changed **per editor instance** with
  `CodeEditor`'s `chromeOverrides`: (i.e. CSS custom properties set inline on that editor's own DOM nodes.)
- Those are the only two extension points. **Nobody outside this module calls
  `monaco.editor.defineTheme` or `monaco.editor.setTheme`**.

### Theming Guidelines
| I want to… | Use | Scope |
| --- | --- | --- |
| colour my language's tokens | `languageThemeResolver` on the language definition (`registerLanguageThemeResolver`) | that language, everywhere |
| change one editor's background, widgets, gutter, diff colors | `<CodeEditor chromeOverrides={…} />` | that editor instance |
| the same, for an editor created with `monaco.editor.create*` | `applyKbnCodeEditorChromeOverrides([root], overrides, euiTheme)` from `@kbn/code-editor` | that editor instance |
| structural CSS for one editor (z-index, padding, hiding a widget part) | `<CodeEditor scopedCss={(scope) => css\`…\`} />` | that editor instance |
| a transparent editor | `<CodeEditor transparentBackground />` (a one-key chrome override) | that editor instance |
| a second theme, a theme per language, a theme id option | not available | — |


## What Monaco can and cannot scope

The design follows from two facts about Monaco's standalone editor, verified against the pinned
version and checked again on every upgrade (see [Upgrading Monaco](#upgrading-monaco)).

**Token colors cannot be scoped per editor, but are rather scoped per language.** Token colors are
resolved during tokenization and cached on the *model*, and Monaco lets several editors share one
model. What tokenization does know is the language: the theme's trie is queried through
`TokenTheme.match(encodedLanguageId, token)`, which receives the language and then resolves on the
token string alone. Language is therefore the finest granularity Monaco can express, and it is the
one that matters: the bug is one language's rules matching another language's tokens.

**Chrome can be scoped per element.** `StandaloneThemeService._updateCSS` publishes every color of
the active theme as a CSS custom property in one global rule written to a `<style>` element it owns:

```css
.monaco-editor, .monaco-diff-editor, .monaco-component {
  --vscode-editor-background: …;
  --vscode-editorSuggestWidget-selectedBackground: …;
  …
}
```

Monaco's own stylesheet then consumes them likeso: `.monaco-editor { background-color:
var(--vscode-editor-background) }`, and likewise for the gutter, selection, widgets and diff
decorations. A property set inline on an editor's root beats that rule, descendants inherit it, and
Monaco never writes anything to the root's `style` attribute except `width` and `height`. So an
editor's chrome can be changed for that editor alone, with no stylesheet, no selector and no unique
id, and nothing else on the page is touched. The exceptions are the canvas-drawn parts (minimap,
overview ruler) and the inline-edits SVG views, which read colors from the theme object: they
always show the default.

## Layer 1: syntax, scoped per language

A language opts in by setting `languageThemeResolver` on its definition, which calls
`monaco.editor.registerLanguageThemeResolver(languageId, resolver)`. The resolver returns
`{ rules }` only (`Pick<IStandaloneThemeData, 'rules'>`), authored against the tokenizer's own token
names exactly as before. Scoping is applied by the module, never by hand:

- `TokenTheme.prototype.match` is patched at import time. For a language with a registered resolver
  it prefixes the token with the language id before the trie lookup, so `variable` is looked up as
  `esql.variable`. Monaco's `match` receives the *encoded* language id and its public API only
  converts the other way, so the prefix is resolved by scanning the (tiny) scoped set and memoised,
  misses included, because unscoped languages are the common case on a hot path. Encoded ids below 2
  are never scoped: 0 is Monaco's Null language and 1 is plaintext, and `encodeLanguageId` returns 0
  for ids it does not know.
- `initializeRegisteredLanguagesTheme` builds the one theme. Each scoped language's namespace is
  seeded with the shared Kibana rules and then the language's own rules are layered on top. The
  seeding is necessary: a namespaced token such as `esql.string` no longer prefix-matches the
  shared `string` rule, so without it a scoped language would lose every shared color.
- The root rule (token `''`) becomes the bare language prefix so it still matches every token of
  that language, and its `background` is dropped. Monaco treats `background` on the root rule as the
  theme's default background, but once the rule has a name it becomes a per-token style and would
  paint a block behind every token.
- Language ids matching `/\b(comment|string|regex|regexp)\b/` are rejected. Monaco derives the
  `StandardTokenType` (which drives bracket matching and comment/string-aware behavior) by regexing
  the token string, so a language id containing one of those words would mis-classify every token
  in that language once used as a prefix. The check runs before the resolver is stored, so a
  rejected id is never left registered.

Monarch grammars append `.<languageId>` to tokens by default (`tokenPostfix`), so ES|QL tokens
already end in `.esql`. That is unrelated to this scoping and still works: the prefix is applied to
whatever string the tokenizer produced.

## Layer 2: chrome, scoped per editor instance

This layer lives in `@kbn/code-editor`, not here: it is about how one React editor instance is
styled, and `@kbn/monaco` only owns the theme that every instance shares. The mechanism is the CSS
custom-property fact above, applied inline to the nodes an editor owns; the API is `CodeEditor`'s
`chromeOverrides` prop (and `applyKbnCodeEditorChromeOverrides` for editors created with
`monaco.editor.create*`). See the "Chrome" section of
[`@kbn/code-editor`'s README](../../../../shared-ux/code_editor/impl/README.mdx).

What this package contributes to that layer is the vocabulary: `buildChromeColors` in `theme.ts`
is the default chrome every editor gets, and its literal keys are exported as
`KbnCodeEditorThemeColorId` so the override prop can offer them for completion. It is deliberately
not annotated as `IColors`, which would widen the keys to `string`.

## Registration lifecycle

`@kbn/code-editor` calls `initializeRegisteredLanguagesTheme(useEuiTheme())` on mount and whenever
the EUI theme changes. Editors created with `monaco.editor.create*` directly must call it
themselves, before creating, because nothing else guarantees the theme exists; Monaco silently
falls back to `vs` for an unknown theme id.

The call is a no-op when Monaco already holds the theme for the current palette and language set,
which is every mount after the first. That matters beyond saving the computation: `defineTheme` on
the active theme makes Monaco regenerate its color stylesheet and re-tokenise every live model on
the page.

The registration is tracked in a single slot keyed on the palette and the sorted set of registered
language ids, deliberately not a cache: Monaco keeps one theme per id, so the question is "what is
registered now", and a cache answering "what was computed before" drifts from that as soon as the
slot is overwritten. The theme data itself comes from a builder memoised per palette, so a light →
dark → light round-trip re-registers but never recomputes. A language registered later changes the
key and triggers one re-registration.

The palette is identified by three computed colors, `backgroundBasePlain`, `textParagraph` and
`borderBasePlain`, never by object identity and never by `colorMode`. EUI issues a fresh `euiTheme`
object on every mode change, so identity misses on the way back. And EUI's provider updates
`colorMode` and the computed theme in separate commits
([elastic/eui#10198](https://github.com/elastic/eui/issues/10198)), so on a live switch there is one
render where the flag has flipped but the colors have not. Keyed on `colorMode`, that render would
register a dark theme built from light colors. Keyed on the colors, it resolves to the palette
already registered and is a no-op, so a switch registers exactly once. Color mode moves the first
two colors; high-contrast mode only overrides `border*` tokens, hence the third.

## Rejected alternatives

Kept here so the next person does not have to rediscover why.

- **A theme per editor or per model.** Not expressible: token colours are cached on the model,
  which editors can share, and the theme service is global. The upstream issue has been open since
  2019.
- **Registering only the current language's theme on mount.** Moves the race rather than removing
  it: two editors with different languages still fight over the one active theme.
- **Named theme variants with a `themeOverride` prop** (built on this branch, then removed). A
  variant is still selected through the global `setTheme`, so it carries the exact last-mount-wins
  hazard the rest of the design removes. Its only consumer was a transparent variant, which is a
  one-key chrome override. Keeping it would have meant a second extension point that contradicts the
  first.
- **Global Emotion CSS with `.monaco-editor { --vscode-*: … }`.** What consumers did before. It
  works for the one editor that is visible and restyles every other editor on the page.
- **Attribute selectors scoped under an Emotion `css` prop class.** Emotion emits every nested
  selector as a descendant of the element's class, and the overflow-widgets node is portaled to
  `body`, so the portaled widgets never match. Overloading `data-test-subj` for this also collides:
  every `CodeEditor` without an explicit test subject shares the default one.
- **Hooking a language contribution** (document highlights, hover) to influence colours. Those
  contributions decorate ranges; they do not participate in theme resolution.

## Upgrading Monaco

The design leans on three internals. Check each after an upgrade; the first is guarded at import
time and the suite covers the other two.

| Internal | Where | What to check |
| --- | --- | --- |
| `TokenTheme.prototype.match(encodedLanguageId, token)` | `editor/common/languages/supports/tokenization` | still two arguments; the module throws at import if not |
| `asCssVariableName`: `--vscode-` + id with `.` → `-` | `platform/theme/common/colorUtils` | mapping unchanged; mirrored by `toMonacoCssVariableName` in `@kbn/code-editor` |
| global colour rule on `.monaco-editor, .monaco-diff-editor, .monaco-component` | `standalone/browser/standaloneThemeService` (`_updateCSS`) | selector list unchanged; mirrored by `MONACO_CHROME_NODE_SELECTOR` in `@kbn/code-editor` |

Also confirm that the root's `style` attribute still only receives `width`/`height`, and that the
`StandardTokenType` regex still matches `comment|string|regex|regexp`.

## Files

| File | Responsibility |
| --- | --- |
| `index.ts` | the `match` patch, `registerLanguageThemeResolver`, rule namespacing, the registration slot and `initializeRegisteredLanguagesTheme` |
| `theme.ts` | the Kibana theme: shared token rules and the default chrome (`buildChromeColors`, source of `KbnCodeEditorThemeColorId`) |
| `constants.ts` | `CODE_EDITOR_DEFAULT_THEME_ID`, the one theme id |
| `index.test.ts` | scoping, rendered colours via `monaco.editor.colorize`, the #258514 regression, registration and palette-key behaviour |

Per-instance chrome (`chrome_overrides.ts` and its tests) lives in
`src/platform/packages/shared/shared-ux/code_editor/impl/`.

## Verifying a change

Unit: `node scripts/jest.js --config src/platform/packages/shared/kbn-monaco/jest.config.js
src/platform/packages/shared/kbn-monaco/src/languages/theming`, plus the `@kbn/code-editor` suites
(`src/platform/packages/shared/shared-ux/code_editor/impl/jest.config.js`), which cover the chrome
layer.

Browser: `@kbn/monaco` ships inside `kbn-ui-shared-deps-src`, which the dev server does not
rebuild, so run `pnpm --filter @kbn/ui-shared-deps-src run build` and hard-reload. Then put two
editors of different languages on one page (Discover in ES|QL mode with the doc viewer's JSON tab
open is the original case), confirm each keeps its own chrome and syntax colours, and flip the dev
toolbar's "Toggle color theme" button: it switches EUI's mode live, without a reload, which is the
path the palette key exists for.
