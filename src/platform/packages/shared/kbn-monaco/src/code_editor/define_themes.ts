/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { monaco } from '../monaco_imports';
import { scopeThemeRuleToken } from '../language_theme_scope';
import { CODE_EDITOR_DEFAULT_THEME_ID } from './constants';
import { defaultThemesResolvers } from '.';

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
 * Registers every code editor theme for the given EUI theme.
 *
 * Monaco keeps one active theme for the whole page, so a theme per language meant the last editor
 * to mount repainted every other editor (https://github.com/elastic/kibana/issues/258514). Instead
 * every theme here shares one rule set: the shared rules, plus one namespace per language that
 * ships a `languageThemeResolver`. Token colours then follow the language, not the mount order.
 *
 * `colors` stay per theme. They are editor chrome — backgrounds, the suggest widget — which Monaco
 * only expresses globally, so they continue to follow the active theme exactly as before.
 */
export const defineCodeEditorThemes = (euiTheme: UseEuiTheme): void => {
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
