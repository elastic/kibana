/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { create as monarchCreate } from '@elastic/monaco-esql';
import * as monarchDefinitions from '@elastic/monaco-esql/lib/definitions';
import type { UseEuiTheme } from '@elastic/eui';
import { monaco } from './monaco_imports';
import { scopeLanguageTheme } from './language_theme_scope';
import { defineCodeEditorThemes } from './code_editor/define_themes';
import { CODE_EDITOR_DEFAULT_THEME_ID } from './code_editor/constants';
import { buildEsqlTheme } from './languages/definitions/esql/lib/theme';
import { ESQL_LANG_ID } from './languages/definitions/esql/lib/constants';
import { buildConsoleTheme } from './languages/definitions/console/theme';
import { CONSOLE_LANG_ID } from './languages/definitions/console/constants';
import { lexerRules as consoleLexerRules } from './languages/definitions/console/lexer_rules';
import { XJsonLang } from './languages/definitions/xjson';

// `registerLanguageThemeResolver` — and with it the scoping this suite exercises — is installed
// onto `monaco.editor` as a side effect of loading the package globals.
jest.mock('./languages/worker_factory', () => ({ getWorker: jest.fn() }));

const ESQL_QUERY = 'FROM idx | EVAL x = "s" | WHERE n > 1 AND p == ?param';
const JSON_DOCUMENT = '{"a": "s", "b": 1, "c": true}';
const CONSOLE_REQUEST = 'GET _search?size=1\n{\n  "query": { "match_all": {} }\n}';

/**
 * Hands every `euiTheme.colors.*` lookup its own colour, so two theme rules collide in the
 * resulting colour map only when they genuinely resolve to the same EUI token.
 */
const createMockEuiTheme = (): UseEuiTheme => {
  const assignedColors = new Map<string, string>();

  const colorFor = (key: string) => {
    if (!assignedColors.has(key)) {
      assignedColors.set(key, `#${(assignedColors.size + 1).toString(16).padStart(6, '0')}`);
    }
    return assignedColors.get(key)!;
  };

  const colors = new Proxy(
    { vis: new Proxy({}, { get: (_target, key: string) => colorFor(`vis.${key}`) }) },
    {
      get: (target, key: string) =>
        key === 'vis' ? Reflect.get(target, key) : colorFor(key as string),
    }
  );

  return {
    colorMode: 'LIGHT',
    highContrastMode: false,
    modifications: {},
    euiTheme: { colors } as unknown as UseEuiTheme['euiTheme'],
  };
};

const colorizedClassesOf = async (text: string, languageId: string) => {
  const html = await monaco.editor.colorize(text, languageId, {});
  return [...html.matchAll(/class="(mtk[^"]*)"/g)].map(([, className]) => className).join(' | ');
};

describe('language scoped editor themes', () => {
  beforeAll(async () => {
    await import('./register_globals');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    monaco.languages.register({ id: XJsonLang.ID });
    monaco.languages.setMonarchTokensProvider(XJsonLang.ID, XJsonLang.lexerRules!);

    monaco.languages.register({ id: ESQL_LANG_ID });
    monaco.languages.setMonarchTokensProvider(
      ESQL_LANG_ID,
      monarchCreate({ ...monarchDefinitions, functions: [] })
    );
    monaco.editor.registerLanguageThemeResolver(ESQL_LANG_ID, buildEsqlTheme, true);

    // Console is the second scoped language: its theme is built on top of the shared one, so it
    // exercises the root (`''`) rule that namespacing has to special-case.
    monaco.languages.register({ id: CONSOLE_LANG_ID });
    monaco.languages.setMonarchTokensProvider(CONSOLE_LANG_ID, consoleLexerRules);
    monaco.editor.registerLanguageThemeResolver(CONSOLE_LANG_ID, buildConsoleTheme, true);

    defineCodeEditorThemes(createMockEuiTheme());
  });

  describe('defineCodeEditorThemes', () => {
    it('namespaces a language theme to its own tokens and leaves shared rules alone', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

      defineCodeEditorThemes(createMockEuiTheme());

      const [, themeData] = defineTheme.mock.calls.find(
        ([themeId]) => themeId === CODE_EDITOR_DEFAULT_THEME_ID
      )!;
      const tokens = themeData.rules.map(({ token }) => token);

      // ES|QL colours `variable` with `textSuccess`, and xjson tokenizes object keys as `variable`.
      // Namespacing is what stops that rule reaching anything but ES|QL.
      expect(tokens).toContain(`${ESQL_LANG_ID}.variable`);
      expect(tokens).toContain('variable');

      expect(tokens.filter((token) => token.startsWith(`${ESQL_LANG_ID}.`)).length).toBeGreaterThan(
        0
      );
      // Nothing from the language theme may land unscoped.
      const esqlOnlyTokens = buildEsqlTheme(createMockEuiTheme())
        .rules.map(({ token }) => token)
        .filter((token) => !tokens.includes(`${ESQL_LANG_ID}.${token}`));
      expect(esqlOnlyTokens).toEqual([]);

      defineTheme.mockRestore();
    });

    it('gives every registered theme the same rule set, so only colors differ', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

      defineCodeEditorThemes(createMockEuiTheme());

      const ruleSets = defineTheme.mock.calls.map(([, themeData]) =>
        themeData.rules.map(({ token }) => token).join()
      );

      expect(new Set(ruleSets).size).toBe(1);

      defineTheme.mockRestore();
    });
  });

  describe('rendered colors', () => {
    it('keeps JSON colors stable when the ES|QL theme becomes the active theme', async () => {
      monaco.editor.setTheme(CODE_EDITOR_DEFAULT_THEME_ID);
      const underDefaultTheme = await colorizedClassesOf(JSON_DOCUMENT, XJsonLang.ID);

      monaco.editor.setTheme(ESQL_LANG_ID);
      const underEsqlTheme = await colorizedClassesOf(JSON_DOCUMENT, XJsonLang.ID);

      expect(underEsqlTheme).toBe(underDefaultTheme);
    });

    it('keeps ES|QL colors stable when the default theme becomes the active theme', async () => {
      monaco.editor.setTheme(ESQL_LANG_ID);
      const underEsqlTheme = await colorizedClassesOf(ESQL_QUERY, ESQL_LANG_ID);

      monaco.editor.setTheme(CODE_EDITOR_DEFAULT_THEME_ID);
      const underDefaultTheme = await colorizedClassesOf(ESQL_QUERY, ESQL_LANG_ID);

      expect(underDefaultTheme).toBe(underEsqlTheme);
    });

    it.each([
      ['JSON', JSON_DOCUMENT, XJsonLang.ID],
      ['ES|QL', ESQL_QUERY, ESQL_LANG_ID],
      ['Console', CONSOLE_REQUEST, CONSOLE_LANG_ID],
    ])('renders %s identically under every registered theme', async (_name, text, languageId) => {
      const renderedPerTheme = [];

      for (const activeTheme of [CODE_EDITOR_DEFAULT_THEME_ID, ESQL_LANG_ID, CONSOLE_LANG_ID]) {
        monaco.editor.setTheme(activeTheme);
        renderedPerTheme.push(await colorizedClassesOf(text, languageId));
      }

      expect(new Set(renderedPerTheme).size).toBe(1);
      // Guards against the matrix passing because every token collapsed to one default colour.
      expect(new Set(renderedPerTheme[0].split(' | ')).size).toBeGreaterThan(3);
    });

    it('still colors ES|QL distinctly from JSON', async () => {
      monaco.editor.setTheme(CODE_EDITOR_DEFAULT_THEME_ID);

      const esqlClasses = await colorizedClassesOf(ESQL_QUERY, ESQL_LANG_ID);
      const jsonClasses = await colorizedClassesOf(JSON_DOCUMENT, XJsonLang.ID);

      // A scoped language that resolved to nothing would collapse to a single default-coloured run.
      expect(new Set(esqlClasses.split(' | ')).size).toBeGreaterThan(3);
      expect(esqlClasses).not.toBe(jsonClasses);
    });
  });

  describe('scopeLanguageTheme', () => {
    it.each(['comment', 'my-string-lang', 'regexp'])(
      'rejects "%s" because Monaco reads token types out of the token string',
      (languageId) => {
        expect(() => scopeLanguageTheme(languageId)).toThrow(/StandardTokenType/);
      }
    );
  });
});
