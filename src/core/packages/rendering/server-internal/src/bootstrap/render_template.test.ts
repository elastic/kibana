/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import vm from 'vm';

import { renderTemplate } from './render_template';

const SHARED_DEPS_PATHS = [
  '/bundles/kbn-ui-shared-deps-npm.dll.js',
  '/bundles/kbn-ui-shared-deps-src.js',
];
const TRANSLATION_RESILIENCE_BUNDLE_PATH =
  '/bundles/kbn-translation-resilience/translation_resilience.js';

function mockParams() {
  return {
    themeTagName: 'borealis',
    colorMode: 'light',
    jsDependencyPaths: ['/js-1', '/js-2'],
    translationResilienceBundlePath: TRANSLATION_RESILIENCE_BUNDLE_PATH,
    styleSheetPaths: ['/style-1', '/style-2'],
    publicPathMap: '{"foo": "bar"}',
  };
}

interface InsertedScript {
  src: string;
  /** `false` keeps insertion order as execution order. `undefined` is the browser default (`true`). */
  async: boolean | undefined;
}

/** Runs the generated bootstrap and records each script tag it inserts. */
async function loadInsertedScripts(
  installTranslationResilience: boolean
): Promise<InsertedScript[]> {
  const insertedScripts: InsertedScript[] = [];
  const dataElement = (data: Record<string, boolean>) => ({
    getAttribute: (name: string) => (name === 'data' ? JSON.stringify(data) : null),
  });

  const sandbox = {
    document: {
      querySelector(selector: string) {
        switch (selector) {
          case 'kbn-csp':
            return dataElement({ strictCsp: false });
          case 'kbn-prototype-hardening':
            return dataElement({ hardenPrototypes: false });
          case 'kbn-translation-resilience':
            return dataElement({ installTranslationResilience });
          case 'head meta[name="add-styles-here"]':
          case 'head meta[name="add-scripts-here"]':
            return {};
          default:
            return null;
        }
      },
      getElementById(id: string) {
        return id === 'kbn_loading_message' ? { style: {} } : null;
      },
      createElement: () => ({
        style: {},
        addEventListener: () => undefined,
      }),
      head: {
        insertBefore: (node: { src?: string; async?: boolean }) => {
          if (typeof node.src === 'string') {
            insertedScripts.push({ src: node.src, async: node.async });
          }
        },
      },
    },
    window: {
      // Skips the expected CSP console message; script loading still runs.
      __kbnCspNotEnforced__: true,
      console: { log: () => undefined },
    },
    performance: { mark: () => undefined },
  };

  vm.runInNewContext(
    await renderTemplate({
      ...mockParams(),
      jsDependencyPaths: SHARED_DEPS_PATHS,
    }),
    sandbox
  );
  return insertedScripts;
}

describe('renderTemplate', () => {
  test('resolves to a string', async () => {
    const content = await renderTemplate(mockParams());
    expect(typeof content).toEqual('string');
  });

  test('interpolates templateData into string template', async () => {
    const content = await renderTemplate(mockParams());
    expect(content).toMatchSnapshot();
  });
  test('interpolates system color mode', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      themeTagName: 'borealis',
      colorMode: 'system',
    });
    expect(content).toMatchSnapshot();
  });

  test('omits the translation resilience bundle when the user has not opted in', async () => {
    const scripts = await loadInsertedScripts(false);

    expect(scripts.map((script) => script.src)).toEqual(SHARED_DEPS_PATHS);
    expect(scripts.every((script) => script.async === false)).toBe(true);
  });

  test('loads the translation resilience bundle before the shared-deps scripts when the user opts in', async () => {
    const scripts = await loadInsertedScripts(true);

    expect(scripts.map((script) => script.src)).toEqual([
      TRANSLATION_RESILIENCE_BUNDLE_PATH,
      ...SHARED_DEPS_PATHS,
    ]);
    expect(scripts.every((script) => script.async === false)).toBe(true);
  });

  test('loads bundles from an IIFE instead of window.onload', async () => {
    const content = await renderTemplate(mockParams());
    expect(content).not.toContain('window.onload = function');
    expect(content).toContain('(function () {');
    expect(content).toContain('})();');
  });

  test('includes __REACT_DEVTOOLS_GLOBAL_HOOK__ stub when useHMR is true', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: true,
    });
    expect(content).toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
    expect(content).toContain('supportsFiber: true');
    expect(content).toContain('inject: function');
  });

  test('does NOT include __REACT_DEVTOOLS_GLOBAL_HOOK__ stub when useHMR is false', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: false,
    });
    expect(content).not.toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
  });

  test('does NOT include __REACT_DEVTOOLS_GLOBAL_HOOK__ stub by default', async () => {
    const content = await renderTemplate(mockParams());
    expect(content).not.toContain('__REACT_DEVTOOLS_GLOBAL_HOOK__');
  });

  test('includes __kbnHmrActive__ = true when useHMR is true', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: true,
    });
    expect(content).toContain('__kbnHmrActive__ = true');
  });

  test('does NOT include __kbnHmrActive__ when useHMR is false', async () => {
    const content = await renderTemplate({
      ...mockParams(),
      useHMR: false,
    });
    expect(content).not.toContain('__kbnHmrActive__');
  });
});
