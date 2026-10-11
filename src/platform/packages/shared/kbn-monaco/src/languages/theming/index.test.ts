/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { create as monarchCreate } from '@elastic/monaco-esql';
import * as monarchDefinitions from '@elastic/monaco-esql/lib/definitions';
import type { UseEuiTheme } from '@elastic/eui';
import { monaco } from '../../monaco_imports';
import {
  scopeLanguageTheme,
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
  defaultThemesResolvers,
  initializeRegisteredLanguagesTheme,
} from '.';
import { buildEsqlTheme } from '../definitions/esql/lib/theme';
import { ESQL_LANG_ID } from '../definitions/esql/lib/constants';
import { buildConsoleTheme } from '../definitions/console/theme';
import { CONSOLE_LANG_ID } from '../definitions/console/constants';
import { lexerRules as consoleLexerRules } from '../definitions/console/lexer_rules';
import { XJsonLang } from '../definitions/xjson';

// `registerLanguageThemeResolver` — and with it the scoping this suite exercises — is installed
// onto `monaco.editor` as a side effect of loading the package globals.
jest.mock('../worker_factory', () => ({ getWorker: jest.fn() }));

const ESQL_QUERY = 'FROM idx | EVAL x = "s" | WHERE n > 1 AND p == ?param';
const JSON_DOCUMENT = '{"a": "s", "b": 1, "c": true}';
const CONSOLE_REQUEST = 'GET _search?size=1\n{\n  "query": { "match_all": {} }\n}';

const keyByColor = new Map<string, string>();

/**
 * Derives a colour from the token *name*, so every mock instance maps `textSuccess` to the same
 * hex and two rules collide in the colour map only when they resolve to the same EUI token.
 * Access-order assignment would not survive memoisation: the shared rules may come from an earlier
 * mock instance than the language rules, and the 4th key each happened to touch would share a hex.
 */
const colorFor = (key: string) => {
  // Backgrounds stay near-white / near-black, as EUI's are. Console runs its token colours through
  // `makeHighContrastColor` against the background, and a random mid-tone background makes that
  // collapse most of them to the same output, which would hide real colour differences.
  const [palette, token] = key.split(':');
  if (token.startsWith('background')) {
    return palette === 'dark' ? '#111111' : '#ffffff';
  }

  // First 24 bits of a digest: stable across runs and instances, no hand-rolled hashing.
  const color = `#${createHash('sha256').update(key).digest('hex').slice(0, 6)}`;

  const owner = keyByColor.get(color);
  if (owner !== undefined && owner !== key) {
    throw new Error(`Mock colour collision: "${key}" and "${owner}" both hash to ${color}`);
  }
  keyByColor.set(color, key);
  return color;
};

/**
 * Hands every `euiTheme.colors.*` lookup a colour unique to that token. `palette` namespaces the
 * colours, so a dark mock's values genuinely differ from a light mock's, as EUI's do.
 */
const createMockEuiTheme = ({
  colorMode = 'LIGHT',
  palette = 'light',
}: { colorMode?: UseEuiTheme['colorMode']; palette?: string } = {}): UseEuiTheme => {
  const colors = new Proxy(
    { vis: new Proxy({}, { get: (_target, key: string) => colorFor(`${palette}:vis.${key}`) }) },
    {
      get: (target, key: string) =>
        key === 'vis' ? Reflect.get(target, key) : colorFor(`${palette}:${key as string}`),
    }
  );

  return {
    colorMode,
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
    await import('../../register_globals');

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

    initializeRegisteredLanguagesTheme(createMockEuiTheme());
  });

  describe('initializeRegisteredLanguagesTheme', () => {
    // The initializer is memoised per palette; these tests spy on `defineTheme`, so each needs a
    // fresh cache or the call under test is a no-op.
    beforeEach(() => {
      initializeRegisteredLanguagesTheme.reset();
    });

    it('namespaces a language theme to its own tokens and leaves shared rules alone', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

      initializeRegisteredLanguagesTheme(createMockEuiTheme());

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

      initializeRegisteredLanguagesTheme(createMockEuiTheme());

      const ruleSets = defineTheme.mock.calls.map(([, themeData]) =>
        themeData.rules.map(({ token }) => token).join()
      );

      expect(new Set(ruleSets).size).toBe(1);

      defineTheme.mockRestore();
    });
  });

  describe('rendered colors', () => {
    // Only Kibana's two themes exist; language-named ids are no longer registered, and Monaco
    // silently falls back to `vs` for an unknown id, so asserting against one would be meaningless.
    const REGISTERED_THEMES = [CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID];

    it.each([
      ['JSON', JSON_DOCUMENT, XJsonLang.ID],
      ['ES|QL', ESQL_QUERY, ESQL_LANG_ID],
      ['Console', CONSOLE_REQUEST, CONSOLE_LANG_ID],
    ])('renders %s identically under every registered theme', async (_name, text, languageId) => {
      const renderedPerTheme = [];

      for (const activeTheme of REGISTERED_THEMES) {
        monaco.editor.setTheme(activeTheme);
        renderedPerTheme.push(await colorizedClassesOf(text, languageId));
      }

      expect(new Set(renderedPerTheme).size).toBe(1);
      // Guards against the matrix passing because every token collapsed to one default colour.
      expect(new Set(renderedPerTheme[0].split(' | ')).size).toBeGreaterThan(3);
    });

    it('keeps the ES|QL palette off JSON object keys while both share one theme (#258514)', async () => {
      monaco.editor.setTheme(CODE_EDITOR_DEFAULT_THEME_ID);

      // xjson tokenizes object keys as `variable`; ES|QL colours `variable` with `textSuccess`.
      // Before scoping, the active ES|QL rules repainted JSON keys green. The second JSON span is
      // the key `"a"`; the last ES|QL span is the `?param` variable.
      const jsonKeyClass = (await colorizedClassesOf(JSON_DOCUMENT, XJsonLang.ID)).split(' | ')[1];
      const esqlVariableClass = (await colorizedClassesOf(ESQL_QUERY, ESQL_LANG_ID))
        .split(' | ')
        .at(-1);

      expect(jsonKeyClass).toBeDefined();
      expect(jsonKeyClass).not.toBe(esqlVariableClass);
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

  describe('memoization', () => {
    const lightTheme = (): UseEuiTheme => createMockEuiTheme();
    const darkTheme = (): UseEuiTheme => createMockEuiTheme({ colorMode: 'DARK', palette: 'dark' });

    beforeEach(() => {
      initializeRegisteredLanguagesTheme.reset();
    });

    it('computes a shared theme once per colour mode, keyed on mode rather than identity', () => {
      const resolve = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID];

      const light = resolve(lightTheme());
      // A different object for the same mode — what EUI hands out after a mode round-trip.
      expect(resolve(lightTheme())).toBe(light);

      const dark = resolve(darkTheme());
      expect(dark).not.toBe(light);
      expect(dark.base).toBe('vs-dark');

      // Back to light: still the original computation.
      expect(resolve(lightTheme())).toBe(light);
    });

    // `useEuiTheme()` reads `colorMode` and the computed theme from separate contexts, so a live
    // mode switch has one render where the mode has flipped but the colours haven't. Keyed on mode
    // alone, that render would be cached and every consistent render after it would hit the stale
    // entry — the editor kept the previous mode's background until reload.
    it('does not let a transitional render (new mode, previous colours) poison the builder cache', () => {
      const resolve = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID];
      const light = lightTheme();
      const dark = darkTheme();
      const transitional: UseEuiTheme = { ...light, euiTheme: dark.euiTheme };

      const fromTransitional = resolve(transitional);
      expect(fromTransitional.base).toBe('vs');
      expect(fromTransitional.colors['editor.background']).toBe(
        dark.euiTheme.colors.backgroundBasePlain
      );

      const fromConsistent = resolve(light);
      expect(fromConsistent).not.toBe(fromTransitional);
      expect(fromConsistent.colors['editor.background']).toBe(
        light.euiTheme.colors.backgroundBasePlain
      );
    });

    it('re-registers after a transitional render, with the consistent colours', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');
      const light = lightTheme();
      const transitional: UseEuiTheme = { ...light, euiTheme: darkTheme().euiTheme };

      initializeRegisteredLanguagesTheme(transitional);
      const afterTransitional = defineTheme.mock.calls.length;
      expect(afterTransitional).toBeGreaterThan(0);

      // The consistent render that follows must not be a cache hit on the transitional entry.
      initializeRegisteredLanguagesTheme(light);
      expect(defineTheme.mock.calls.length).toBe(afterTransitional * 2);

      const [, registered] = [...defineTheme.mock.calls]
        .reverse()
        .find(([themeId]) => themeId === CODE_EDITOR_DEFAULT_THEME_ID)!;
      expect(registered.colors['editor.background']).toBe(
        light.euiTheme.colors.backgroundBasePlain
      );

      defineTheme.mockRestore();
    });

    it('registers once per palette change: repeats are no-ops, a round-trip re-registers', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

      initializeRegisteredLanguagesTheme(lightTheme());
      const perInitialisation = defineTheme.mock.calls.length;
      expect(perInitialisation).toBeGreaterThan(0);

      // Same palette again, fresh object: a no-op. This is every subsequent editor mount.
      initializeRegisteredLanguagesTheme(lightTheme());
      expect(defineTheme).toHaveBeenCalledTimes(perInitialisation);

      initializeRegisteredLanguagesTheme(darkTheme());
      expect(defineTheme).toHaveBeenCalledTimes(perInitialisation * 2);

      // Back to light re-registers — Monaco holds one theme per id, and dark overwrote it — but
      // does not recompute: the builders are memoised, so the light data is the cached object.
      const lightData = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](lightTheme());
      initializeRegisteredLanguagesTheme(lightTheme());
      expect(defineTheme).toHaveBeenCalledTimes(perInitialisation * 3);
      expect(defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](lightTheme())).toBe(lightData);

      defineTheme.mockRestore();
    });

    it('re-registers when a language theme is registered after the first initialisation', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

      initializeRegisteredLanguagesTheme(lightTheme());
      const perInitialisation = defineTheme.mock.calls.length;

      monaco.editor.registerLanguageThemeResolver('late-registered', buildEsqlTheme, true);

      initializeRegisteredLanguagesTheme(lightTheme());
      expect(defineTheme).toHaveBeenCalledTimes(perInitialisation * 2);

      defineTheme.mockRestore();
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
