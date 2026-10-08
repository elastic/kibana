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
 * Isolating a theme per editor isn't expressible: token colours are resolved during tokenization
 * and cached on the *model*, which Monaco allows several editors to share. What tokenization does
 * know is the language — `TokenTheme.match(languageId, token)` receives it, then resolves purely on
 * the token string. Language is therefore the finest granularity Monaco can express, and it is the
 * one that matters here: the bug is one language's theme rules matching another language's tokens
 * (ES|QL colours `variable` with `textSuccess`, and xjson tokenizes object keys as `variable`).
 *
 * So prefix the token with its language before the trie lookup. A single theme can then carry one
 * namespace per language (`esql.variable`, `console.method`, ...) and no language's rules can reach
 * another's tokens. Rules stay authored exactly as they are today; the prefix is applied here and
 * in `initializeCodeEditorThemes`, never by hand.
 */

/* eslint-disable @kbn/eslint/module_migration */
// Imported straight from monaco rather than through `../../monaco_imports`, which re-exports this
// module's API — routing back through it would be an import cycle. ESM hands back the same instance.
import * as monaco from 'monaco-editor/editor/editor.api.js';
import { TokenTheme } from 'monaco-editor/editor/common/languages/supports/tokenization.js';
/* eslint-enable @kbn/eslint/module_migration */
import type { UseEuiTheme } from '@elastic/eui';
import { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID } from './constants';
import { buildTheme, buildTransparentTheme } from './theme';

export type KbnMonacoThemingLanguageThemeResolver = (
  args: UseEuiTheme
) => monaco.editor.IStandaloneThemeData;

export interface KbnMonacoTheming {
  /**
   * @description Registers language theme definition for a language
   */
  registerLanguageThemeResolver(
    langId: string,
    languageThemeResolver: KbnMonacoThemingLanguageThemeResolver,
    forceOverride?: boolean
  ): void;
  /**
   * @description Returns the registered language theme definition for the provided id
   */
  getLanguageThemeResolver(langId: string): KbnMonacoThemingLanguageThemeResolver | undefined;
}

const languageThemeResolverDefinitions = new Map<string, KbnMonacoThemingLanguageThemeResolver>();

// Monaco reserves 0 for the Null language and 1 for plaintext. Neither is ever scoped, and
// `encodeLanguageId` returns 0 for languages it doesn't know — so ids below this are never a match.
const FIRST_SCOPEABLE_ENCODED_LANGUAGE_ID = 2;

// Monaco derives `StandardTokenType` by regexing the token string we hand it, which drives bracket
// matching and comment/string-aware behaviour. A language id containing one of these words would
// mis-classify every token in that language once used as a prefix.
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
export const scopeLanguageTheme = (languageId: string): void => {
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
   * @description Registration for implementation of {@link monaco.editor.registerLanguageThemeResolver}
   */
  registerLanguageThemeResolver: {
    value: ((langId, languageThemeDefinition, forceOverride) => {
      if (!forceOverride && languageThemeResolverDefinitions.has(langId)) {
        throw new Error(`Language theme resolver for ${langId} is already registered`);
      }
      languageThemeResolverDefinitions.set(langId, languageThemeDefinition);
      // Shipping a theme for a language is what opts it into scoped theming: its rules are
      // namespaced to its own tokens so they can't repaint another language's, and vice versa.
      // See this module's header for why Monaco can't scope per editor instead.
      scopeLanguageTheme(langId);
    }) satisfies typeof monaco.editor.registerLanguageThemeResolver,
    enumerable: true,
    configurable: false,
  },
  /**
   * @description Registration for implementation of {@link monaco.editor.getLanguageThemeResolver}
   */
  getLanguageThemeResolver: {
    value: ((langId) =>
      languageThemeResolverDefinitions.get(
        langId
      )) satisfies typeof monaco.editor.getLanguageThemeResolver,
    enumerable: true,
    configurable: false,
  },
});

// export these so that they are consumed by the actual code editor implementation
const defaultThemesResolvers = {
  [CODE_EDITOR_DEFAULT_THEME_ID]: buildTheme,
  [CODE_EDITOR_TRANSPARENT_THEME_ID]: buildTransparentTheme,
};

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
 * Registers to monaco every configured language theme for the given EUI theme.
 */
const initializeCodeEditorThemes = (euiTheme: UseEuiTheme): void => {
  const sharedRules = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](euiTheme).rules;

  const languageThemes = monaco.languages.getLanguages().flatMap(({ id: languageId }) => {
    const languageThemeResolver = monaco.editor.getLanguageThemeResolver(languageId);
    return languageThemeResolver ? [[languageId, languageThemeResolver(euiTheme)] as const] : [];
  });

  // A scoped language no longer prefix-matches the shared rules — `esql.string` doesn't match a
  // `string` rule — so seed each namespace with the shared palette and let the language override it.
  const scopedRules = languageThemes.flatMap(([languageId, languageTheme]) =>
    [...sharedRules, ...languageTheme.rules].map((rule) => scopeRule(languageId, rule))
  );

  Object.entries(defaultThemesResolvers).forEach(([themeId, themeResolver]) => {
    const theme = themeResolver(euiTheme);
    monaco.editor.defineTheme(themeId, { ...theme, rules: [...theme.rules, ...scopedRules] });
  });

  // Language-named themes stay registered so callers passing `theme: ESQL_LANG_ID` keep working.
  // They now differ from the defaults only in `colors`; the rules are the same shared set.
  languageThemes.forEach(([languageId, languageTheme]) => {
    monaco.editor.defineTheme(languageId, {
      ...languageTheme,
      rules: [...sharedRules, ...scopedRules],
    });
  });
};

export {
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
  defaultThemesResolvers,
  initializeCodeEditorThemes,
};
