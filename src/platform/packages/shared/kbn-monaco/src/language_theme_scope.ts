/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/eslint/module_migration */
// Imported directly rather than through `./monaco_imports` to avoid an import cycle:
// `register_globals` consumes this module, and ESM hands back the same instance either way.
import * as monaco from 'monaco-editor/editor/editor.api.js';
import { TokenTheme } from 'monaco-editor/editor/common/languages/supports/tokenization.js';

/**
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
 * in `defineCodeEditorThemes`, never by hand.
 */

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

const originalMatch = TokenTheme.prototype.match;

// Fail at import time rather than silently dropping every language's syntax colours.
if (typeof originalMatch !== 'function' || originalMatch.length !== 2) {
  throw new Error(
    'Monaco internal changed: expected TokenTheme.prototype.match(languageId, token). ' +
      'Language-scoped editor themes depend on it — see language_theme_scope.ts.'
  );
}

TokenTheme.prototype.match = function match(encodedLanguageId: number, token: string): number {
  const prefix = resolveLanguagePrefix(encodedLanguageId);
  return originalMatch.call(this, encodedLanguageId, prefix ? `${prefix}.${token}` : token);
};
