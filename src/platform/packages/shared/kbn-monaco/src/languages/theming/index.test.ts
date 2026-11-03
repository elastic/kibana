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
  CODE_EDITOR_DEFAULT_THEME_ID,
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

    it('registers exactly one theme: chrome is per instance, never another theme', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

      initializeRegisteredLanguagesTheme(createMockEuiTheme());

      expect(defineTheme).toHaveBeenCalledTimes(1);
      expect(defineTheme).toHaveBeenCalledWith(CODE_EDITOR_DEFAULT_THEME_ID, expect.any(Object));

      defineTheme.mockRestore();
    });
  });

  describe('rendered colors', () => {
    // Only Kibana's theme exists; language-named ids are no longer registered, and Monaco silently
    // falls back to `vs` for an unknown id, so asserting against one would be meaningless.
    it.each([
      ['JSON', JSON_DOCUMENT, XJsonLang.ID],
      ['ES|QL', ESQL_QUERY, ESQL_LANG_ID],
      ['Console', CONSOLE_REQUEST, CONSOLE_LANG_ID],
    ])('colors %s under the Kibana theme', async (_name, text, languageId) => {
      monaco.editor.setTheme(CODE_EDITOR_DEFAULT_THEME_ID);

      const rendered = await colorizedClassesOf(text, languageId);

      // Guards against a scoped language collapsing to one default colour.
      expect(new Set(rendered.split(' | ')).size).toBeGreaterThan(3);
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

    it('computes a shared theme once per palette, keyed on colours rather than identity', () => {
      const resolve = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID];

      const light = resolve(lightTheme());
      // A different object for the same palette — what EUI hands out after a mode round-trip.
      expect(resolve(lightTheme())).toBe(light);

      const dark = resolve(darkTheme());
      expect(dark).not.toBe(light);
      expect(dark.base).toBe('vs-dark');

      // Back to light: still the original computation.
      expect(resolve(lightTheme())).toBe(light);
    });

    // EUI's provider updates `colorMode` and the computed theme in separate commits, so a live
    // mode switch has one render where the mode has flipped but the colours haven't. The palette,
    // not the flag, decides both the key and the theme's `base`, so that render can't produce a
    // mismatched theme — it resolves to the palette that is already registered.
    it('treats a transitional render (new mode, previous colours) as the previous palette', () => {
      const resolve = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID];
      const light = lightTheme();
      const dark = darkTheme();
      const transitional: UseEuiTheme = { ...light, euiTheme: dark.euiTheme };

      const fromDark = resolve(dark);
      expect(resolve(transitional)).toBe(fromDark);
      expect(fromDark.base).toBe('vs-dark');

      const fromLight = resolve(light);
      expect(fromLight).not.toBe(fromDark);
      expect(fromLight.base).toBe('vs');
      expect(fromLight.colors['editor.background']).toBe(light.euiTheme.colors.backgroundBasePlain);
    });

    it('registers exactly once per live switch: the transitional render is a no-op', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');
      const light = lightTheme();
      const dark = darkTheme();
      const transitional: UseEuiTheme = { ...light, euiTheme: dark.euiTheme };

      initializeRegisteredLanguagesTheme(dark);
      const perRegistration = defineTheme.mock.calls.length;
      expect(perRegistration).toBeGreaterThan(0);

      // The render where EUI has flipped `colorMode` but not yet the colours: nothing to do.
      initializeRegisteredLanguagesTheme(transitional);
      expect(defineTheme).toHaveBeenCalledTimes(perRegistration);

      // The consistent render that follows registers the new palette.
      initializeRegisteredLanguagesTheme(light);
      expect(defineTheme).toHaveBeenCalledTimes(perRegistration * 2);

      const [, registered] = [...defineTheme.mock.calls]
        .reverse()
        .find(([themeId]) => themeId === CODE_EDITOR_DEFAULT_THEME_ID)!;
      expect(registered.base).toBe('vs');
      expect(registered.colors['editor.background']).toBe(
        light.euiTheme.colors.backgroundBasePlain
      );

      defineTheme.mockRestore();
    });

    it('re-registers on a high-contrast switch, which only changes border colours', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');
      const light = lightTheme();
      // EUI's high-contrast overrides touch `border*` tokens only; everything else is identical.
      const highContrast: UseEuiTheme = {
        ...light,
        highContrastMode: 'preferred',
        euiTheme: {
          colors: new Proxy(light.euiTheme.colors, {
            get: (target, key: string) =>
              key === 'borderBasePlain' ? '#000000' : Reflect.get(target, key),
          }),
        } as unknown as UseEuiTheme['euiTheme'],
      };

      initializeRegisteredLanguagesTheme(light);
      const perRegistration = defineTheme.mock.calls.length;

      initializeRegisteredLanguagesTheme(highContrast);
      expect(defineTheme).toHaveBeenCalledTimes(perRegistration * 2);

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

    // The one way a transitional render can still register is when the key changed for another
    // reason — a language registered since the last registration. Even then nothing
    // mismatched is built: the builders are memoised by palette, so the previous palette's theme
    // is a cache hit with its original `base`, and resolvers only read colours. This is why no
    // palette-derived colour mode is needed.
    it('registers a consistent theme even when a transitional render has to register', () => {
      const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');
      const light = lightTheme();
      const dark = darkTheme();

      initializeRegisteredLanguagesTheme(light);
      // Key changes under the slot: the next call will register whatever it is given.
      monaco.editor.registerLanguageThemeResolver('registered-mid-switch', buildEsqlTheme, true);

      // EUI's transitional render: `colorMode` is already DARK, the colours are still light.
      const transitional: UseEuiTheme = { ...dark, euiTheme: light.euiTheme };
      initializeRegisteredLanguagesTheme(transitional);

      const [, registered] = [...defineTheme.mock.calls]
        .reverse()
        .find(([themeId]) => themeId === CODE_EDITOR_DEFAULT_THEME_ID)!;
      // Light colours registered with the light base — not `vs-dark` from the stale flag.
      expect(registered.base).toBe('vs');
      expect(registered.colors['editor.background']).toBe(
        light.euiTheme.colors.backgroundBasePlain
      );

      // The consistent render that follows registers the new palette as usual.
      initializeRegisteredLanguagesTheme(dark);
      const [, registeredDark] = [...defineTheme.mock.calls]
        .reverse()
        .find(([themeId]) => themeId === CODE_EDITOR_DEFAULT_THEME_ID)!;
      expect(registeredDark.base).toBe('vs-dark');
      expect(registeredDark.colors['editor.background']).toBe(
        dark.euiTheme.colors.backgroundBasePlain
      );

      defineTheme.mockRestore();
    });
  });

  describe('registerLanguageThemeResolver', () => {
    it.each(['comment', 'my-string-lang', 'regexp'])(
      'rejects language id "%s" because Monaco reads token types out of the token string',
      (languageId) => {
        expect(() =>
          monaco.editor.registerLanguageThemeResolver(languageId, buildEsqlTheme, true)
        ).toThrow(/StandardTokenType/);
        // A rejected id must not linger as a registered resolver.
        expect(monaco.editor.getLanguageThemeResolver(languageId)).toBeUndefined();
      }
    );
  });
});
