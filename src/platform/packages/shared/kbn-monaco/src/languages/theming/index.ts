/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This module is responsible for defining the theme for the code editor.
 *
 * Monaco applies a single theme to the whole page. `IStandaloneEditorConstructionOptions.theme`
 * reads as per-editor state, but it is a direct call to `IStandaloneThemeService.setTheme`, so the
 * last editor to mount decides the palette for every editor on the page
 * (https://github.com/microsoft/monaco-editor/issues/1289).
 *
 * Isolating a theme per editor isn't expressible: token colors are resolved during tokenization
 * and cached on the *model*, which Monaco allows several editors to share. What tokenization does
 * know is the language — `TokenTheme.match(languageId, token)` receives it, then resolves purely on
 * the token string. Language is therefore the finest granularity Monaco can express, and it is the
 * one that matters here: the bug is one language's theme rules matching another language's tokens
 * (ES|QL colors `variable` with `textSuccess`, and xjson tokenizes object keys as `variable`).
 *
 * So prefix the token with its language before the trie lookup. A single theme can then carry one
 * namespace per language (`esql.variable`, `console.method`, ...) and no language's rules can reach
 * another's tokens. Rules stay authored exactly as they are today; the prefix is applied here and
 * in `initializeRegisteredLanguagesTheme`, never by hand.
 */

/* eslint-disable @kbn/eslint/module_migration */
// Imported straight from monaco rather than through `../../monaco_imports`, which re-exports this
// module's API — routing back through it would be an import cycle. ESM hands back the same instance.
import * as monaco from 'monaco-editor/editor/editor.api.js';
import { TokenTheme } from 'monaco-editor/editor/common/languages/supports/tokenization.js';
/* eslint-enable @kbn/eslint/module_migration */
import type { UseEuiTheme } from '@elastic/eui';
import memoize from 'lodash/memoize';
import { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID } from './constants';
import { buildTheme } from './theme';

/**
 * A language's own token rules, authored against its tokenizer's token names; the namespace is
 * applied at registration. Only `rules` are read — colours are editor chrome, which Monaco keeps
 * global, and belong to a theme variant instead.
 */
export type KbnMonacoLanguageThemeResolver = (
  args: UseEuiTheme
) => Pick<monaco.editor.IStandaloneThemeData, 'rules'>;

/**
 * Colours layered over the Kibana theme's own, producing a theme variant under a new id. The
 * variant inherits everything else: the shared rules, every language namespace, and the
 * registration lifecycle.
 */
export type KbnMonacoThemeColorsOverride = (
  args: UseEuiTheme
) => monaco.editor.IStandaloneThemeData['colors'];

export interface KbnMonacoTheming {
  /**
   * @description Registers language theme definition for a language
   */
  registerLanguageThemeResolver(
    langId: string,
    languageThemeResolver: KbnMonacoLanguageThemeResolver,
    forceOverride?: boolean
  ): void;
  /**
   * @description Returns the registered language theme definition for the provided id
   */
  getLanguageThemeResolver(langId: string): KbnMonacoLanguageThemeResolver | undefined;
  /**
   * @description Registers a color variant of the code editor theme under its own theme id, for
   * use with `CodeEditor`'s `themeOverride` or a direct `monaco.editor.create*` `theme` option.
   */
  registerKbnCodeEditorThemeVariant(
    themeId: string,
    colors: KbnMonacoThemeColorsOverride,
    forceOverride?: boolean
  ): void;
}

const languageThemeResolverDefinitions = new Map<string, KbnMonacoLanguageThemeResolver>();

/**
 * Color variants of the code editor theme, by theme id. The transparent theme is the built-in
 * one: the editor background is painted by the container instead.
 */
const themeVariants = new Map<string, KbnMonacoThemeColorsOverride>([
  [CODE_EDITOR_TRANSPARENT_THEME_ID, () => ({ 'editor.background': '#00000000' })],
]);

/**
 * Monaco reserves 0 for the Null language and 1 for
 * plaintext {@link https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/encodedTokenAttributes.ts#L10 | see encodedTokenAttributes.ts}.
 * Neither is ever scoped, and {@link https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/services/languagesRegistry.ts#L57-L59 | encodeLanguageId} returns 0
 * for languages it doesn't know — so ids below this are never a match.
 */
const FIRST_SCOPEABLE_ENCODED_LANGUAGE_ID = 2;

/**
 * We duplicate the same regex from
 * Monaco's {@link https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/languages/supports/tokenization.ts#L248 | tokenization.ts}.
 * Monaco derives `StandardTokenType` by regexing the token string we hand it, which drives bracket matching and comment/string-aware behaviour.
 * A language id containing one of these words would mis-classify every token in that language once used as a prefix.
 */
const RESERVED_TOKEN_WORDS = /\b(comment|string|regex|regexp)\b/;

const scopedLanguageIds = new Set<string>();

/**
 * Memoised encoded-id -> prefix. `match` receives the *encoded* language id and Monaco's public API
 * only converts the other way, so resolve by scanning the (tiny) scoped set, caching misses too
 * since those are the common case on a hot path.
 */
const prefixByEncodedLanguageId = new Map<number, string | undefined>();

const resolveLanguagePrefix = (encodedLanguageId: number): string | undefined => {
  if (prefixByEncodedLanguageId.has(encodedLanguageId)) {
    return prefixByEncodedLanguageId.get(encodedLanguageId);
  }

  let prefix: string | undefined;

  if (encodedLanguageId >= FIRST_SCOPEABLE_ENCODED_LANGUAGE_ID) {
    for (const languageId of scopedLanguageIds) {
      if (monaco.languages.getEncodedLanguageId(languageId) === encodedLanguageId) {
        prefix = languageId;
        break;
      }
    }
  }

  prefixByEncodedLanguageId.set(encodedLanguageId, prefix);
  return prefix;
};

/**
 * Namespaces a theme rule's token to its language. `''` is the theme's root rule, which becomes the
 * bare language prefix so it still matches every token of that language.
 */
export const scopeThemeRuleToken = (languageId: string, token: string): string =>
  token ? `${languageId}.${token}` : languageId;

/**
 * Opts a language into scoped theming, so its theme rules only ever colour its own tokens.
 * Registration order doesn't matter — the encoded id is resolved lazily on first use.
 */
const scopeLanguageTheme = (languageId: string): void => {
  if (RESERVED_TOKEN_WORDS.test(languageId)) {
    throw new Error(
      `Cannot scope theme rules to language "${languageId}": Monaco derives StandardTokenType from ` +
        `the token string, so a language id matching ${RESERVED_TOKEN_WORDS} would mis-classify ` +
        `every token in that language.`
    );
  }

  scopedLanguageIds.add(languageId);
  // A miss cached before this language was registered would otherwise leave it unscoped forever.
  prefixByEncodedLanguageId.clear();
};

{
  const originalMatch = TokenTheme.prototype.match;

  // Fail at import time rather than silently dropping every language's syntax colours.
  if (typeof originalMatch !== 'function' || originalMatch.length !== 2) {
    throw new Error(
      'Monaco internal changed: expected TokenTheme.prototype.match(languageId, token). ' +
        'Language-scoped editor themes depend on it — see src/languages/theming/index.ts.'
    );
  }

  TokenTheme.prototype.match = function match(encodedLanguageId: number, token: string): number {
    const prefix = resolveLanguagePrefix(encodedLanguageId);
    return originalMatch.call(this, encodedLanguageId, prefix ? `${prefix}.${token}` : token);
  };
}

// add custom methods to monaco editor
Object.defineProperties(monaco.editor, {
  /**
   * @description Registration of implementation for {@link monaco.editor.registerLanguageThemeResolver}
   */
  registerLanguageThemeResolver: {
    value: ((langId, languageThemeDefinition, forceOverride) => {
      if (!forceOverride && languageThemeResolverDefinitions.has(langId)) {
        throw new Error(`Language theme resolver for ${langId} is already registered`);
      }
      // Shipping a theme for a language is what opts it into scoped theming: its rules are
      // namespaced to its own tokens so they can't repaint another language's, and vice versa.
      // See this module's header for why Monaco can't scope per editor instead. Scoping validates
      // the id and throws, so it runs first — a rejected id must not be left registered.
      scopeLanguageTheme(langId);
      languageThemeResolverDefinitions.set(langId, languageThemeDefinition);
    }) satisfies typeof monaco.editor.registerLanguageThemeResolver,
    enumerable: true,
    configurable: false,
  },
  /**
   * @description Registration of implementation for {@link monaco.editor.getLanguageThemeResolver}
   */
  getLanguageThemeResolver: {
    value: ((langId) =>
      languageThemeResolverDefinitions.get(
        langId
      )) satisfies typeof monaco.editor.getLanguageThemeResolver,
    enumerable: true,
    configurable: false,
  },
  /**
   * @description Registration of implementation for {@link monaco.editor.registerKbnCodeEditorThemeVariant}
   */
  registerKbnCodeEditorThemeVariant: {
    value: ((themeId, colors, forceOverride) => {
      if (!forceOverride && themeVariants.has(themeId)) {
        throw new Error(`Code editor theme variant "${themeId}" is already registered`);
      }
      themeVariants.set(themeId, colors);
    }) satisfies typeof monaco.editor.registerKbnCodeEditorThemeVariant,
    enumerable: true,
    configurable: false,
  },
});

/**
 * Namespaces a rule to a language. `background` is dropped from the root rule (`''`): Monaco treats
 * it there as the theme's default background, but once the rule is named it becomes a per-token
 * style and would paint a block behind every token of that language.
 */
const scopeRule = (
  languageId: string,
  rule: monaco.editor.ITokenThemeRule
): monaco.editor.ITokenThemeRule => {
  if (rule.token) {
    return { ...rule, token: scopeThemeRuleToken(languageId, rule.token) };
  }

  const { background, ...rootRule } = rule;
  return { ...rootRule, token: scopeThemeRuleToken(languageId, rule.token) };
};

/**
 * Identifies a palette by its computed colors alone.
 *
 * Not by object identity: EUI issues a fresh `euiTheme` object on every mode change, so identity
 * would miss on the way back from dark to light, and also not by `colorMode` / `highContrastMode`:
 * EUI's provider updates those and the computed theme in separate commits, so on a live switch
 * `useEuiTheme()` has one render where the flag has flipped but the colours haven't.
 * See {@link https://github.com/elastic/eui/issues/10198 | EUI issue 10198} for more details.
 *
 * Keyed on the colors, that render resolves to the palette that is already registered and becomes a no-op.
 * Three colors cover every input the provider can change: color mode moves the first two, and
 * high-contrast mode only overrides `border*` tokens, hence the third.
 */
const paletteKey = ({ euiTheme: { colors } }: UseEuiTheme): string =>
  `${colors.backgroundBasePlain}:${colors.textParagraph}:${colors.borderBasePlain}`;

/**
 * The shared theme builder, memoised per palette so a given EUI theme is computed once for the life
 * of the page. Consumers that build on top of it (`@kbn/workflows-ui`) get the same win for free.
 * The returned object is shared between callers — spread it before changing anything.
 */
const defaultThemesResolvers = {
  [CODE_EDITOR_DEFAULT_THEME_ID]: memoize(
    (euiTheme: UseEuiTheme) => buildTheme(euiTheme),
    paletteKey
  ),
};

/**
 * The palette (plus language and variant sets) whose themes Monaco currently holds. A single slot,
 * deliberately not a cache: Monaco keeps one theme per id, so the question is "what is registered
 * now", and a cache answering "what was computed before" drifts from it as soon as the slot is
 * overwritten.
 */
let registeredThemesKey: string | undefined;

/**
 * Registers the code editor theme and every variant of it with Monaco for the given EUI theme.
 *
 * A no-op when Monaco already holds themes for this palette, language set and variant set — which
 * is every editor mount after the first, and that matters beyond saving the computation:
 * `defineTheme` on the active theme makes Monaco regenerate its colour stylesheet and re-tokenise
 * every live model. Because the key is the palette, the one render per live switch where EUI's
 * `colorMode` has flipped ahead of its colours is also a no-op, so a switch registers exactly once.
 * The theme data comes from the memoised builder, so a light → dark → light round-trip
 * re-registers (one slot per theme id) but never recomputes. A language or variant registered
 * later changes the key.
 */
const initializeRegisteredLanguagesTheme = Object.assign(
  (euiTheme: UseEuiTheme): void => {
    const key = [
      paletteKey(euiTheme),
      [...languageThemeResolverDefinitions.keys()].sort().join(','),
      [...themeVariants.keys()].sort().join(','),
    ].join('|');

    if (key === registeredThemesKey) {
      return;
    }

    const base = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](euiTheme);

    const languageThemes = monaco.languages.getLanguages().flatMap(({ id: languageId }) => {
      const languageThemeResolver = monaco.editor.getLanguageThemeResolver(languageId);
      return languageThemeResolver ? [[languageId, languageThemeResolver(euiTheme)] as const] : [];
    });

    // A scoped language no longer prefix-matches the shared rules — `esql.string` doesn't match a
    // `string` rule — so seed each namespace with the shared palette and let the language override it.
    const scopedRules = languageThemes.flatMap(([languageId, languageTheme]) =>
      [...base.rules, ...languageTheme.rules].map((rule) => scopeRule(languageId, rule))
    );
    const rules = [...base.rules, ...scopedRules];

    // Every theme shares one rule set, so no theme can repaint another language's tokens; variants
    // differ from the default only in `colors`.
    monaco.editor.defineTheme(CODE_EDITOR_DEFAULT_THEME_ID, { ...base, rules });
    themeVariants.forEach((colors, themeId) => {
      monaco.editor.defineTheme(themeId, {
        ...base,
        rules,
        colors: { ...base.colors, ...colors(euiTheme) },
      });
    });

    registeredThemesKey = key;
  },
  {
    /** Forgets what is registered, so the next call registers again. For tests. */
    reset: (): void => {
      registeredThemesKey = undefined;
    },
  }
);

export {
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
  defaultThemesResolvers,
  initializeRegisteredLanguagesTheme,
};
