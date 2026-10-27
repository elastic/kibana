/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runInNewContext } from 'vm';
import { renderTemplate } from './render_template';

function mockParams() {
  return {
    themeTagName: 'borealis',
    colorMode: 'light',
    jsDependencyPaths: ['/js-1', '/js-2'],
    styleSheetPaths: ['/style-1', '/style-2'],
    publicPathMap: '{"foo": "bar"}',
  };
}

interface ElementDouble {
  tagName: string;
  style: Record<string, string>;
  children: ElementDouble[];
  innerHTML: string;
  addEventListener(type: string, listener: (event: { target: ElementDouble }) => void): void;
  dispatchEvent(type: string): void;
  appendChild(child: ElementDouble): void;
  insertBefore(child: ElementDouble, reference: ElementDouble | null): void;
  setAttribute(name: string, value: string): void;
  [property: string]: unknown;
}

// Just enough of the DOM for the bootstrap script (jsdom's selector engine relies on code
// generation, which Kibana's Jest setup disallows). Elements record what the script sets on
// them and let a test fire the `error` event a browser dispatches when an asset fails to load.
function createElement(tagName: string): ElementDouble {
  const listeners: Record<string, Array<(event: { target: ElementDouble }) => void>> = {};
  const element: ElementDouble = {
    tagName: tagName.toUpperCase(),
    style: {},
    children: [],
    set innerHTML(html: string) {
      if (html !== '') {
        throw new Error('only clearing innerHTML is supported');
      }
      this.children = [];
    },
    addEventListener(type, listener) {
      (listeners[type] = listeners[type] || []).push(listener);
    },
    dispatchEvent(type) {
      (listeners[type] || []).forEach((listener) => listener({ target: element }));
    },
    appendChild(child) {
      element.children.push(child);
    },
    insertBefore(child) {
      element.children.push(child);
    },
    setAttribute(name, value) {
      element[name] = value;
    },
  };
  return element;
}

/** Executes the generated bootstrap script against the markup it expects from views/template.tsx. */
async function runBootstrap(params = mockParams()) {
  const loadingMessage = createElement('div');
  const errorMessages = {
    errorMessageTitle: 'Elastic did not load properly',
    errorMessageText: 'Please reload this page.',
    errorMessageReload: 'Reload',
  };
  const elementsBySelector: Record<string, unknown> = {
    'kbn-csp': { getAttribute: () => '{"strictCsp":false}' },
    'kbn-prototype-hardening': { getAttribute: () => '{"hardenPrototypes":false}' },
    '[data-error-message-title]': { dataset: errorMessages },
    '[data-error-message-text]': { dataset: errorMessages },
    '[data-error-message-reload]': { dataset: errorMessages },
    'head meta[name="add-styles-here"]': createElement('meta'),
    'head meta[name="add-scripts-here"]': createElement('meta'),
  };
  const document = {
    head: createElement('head'),
    body: createElement('body'),
    createElement,
    getElementById: (id: string) =>
      id === 'kbn_loading_message' ? loadingMessage : createElement('div'),
    querySelector: (selector: string) => {
      if (!(selector in elementsBySelector)) {
        throw new Error(`Unexpected selector: ${selector}`);
      }
      return elementsBySelector[selector];
    },
  };
  document.body.appendChild(loadingMessage);

  const consoleError = jest.fn();
  const window = {
    window: undefined as unknown,
    document,
    console: { log: jest.fn(), error: consoleError },
    performance: { mark: jest.fn() },
    location: { reload: jest.fn() },
  };
  window.window = window;

  runInNewContext(await renderTemplate(params), window);

  return {
    document,
    loadingMessage,
    consoleError,
    injectedAssets: document.head.children,
    failToLoad: (asset: ElementDouble) => asset.dispatchEvent('error'),
  };
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

  describe('bootstrap failure', () => {
    test('injects the dependencies and shows the loading message', async () => {
      const { loadingMessage, consoleError, injectedAssets } = await runBootstrap();

      expect(injectedAssets.map(({ tagName, src }) => [tagName, src])).toEqual([
        ['SCRIPT', '/js-1'],
        ['SCRIPT', '/js-2'],
      ]);
      expect(loadingMessage.style.display).toBe('flex');
      expect(consoleError).not.toHaveBeenCalled();
    });

    // @kbn/failed-test-reporter-cli matches this message to attribute Scout failures to the CDN
    test('logs the script that failed to load and renders the failure screen', async () => {
      const { document, loadingMessage, consoleError, injectedAssets, failToLoad } =
        await runBootstrap();

      failToLoad(injectedAssets[1]);

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith('Kibana bootstrap failed: could not load /js-2');

      const [errorScreen, ...rest] = document.body.children;
      expect(rest).toEqual([]);
      expect(errorScreen).not.toBe(loadingMessage);
      expect(
        errorScreen.children.map(({ tagName, className, innerText }) => [
          tagName,
          className,
          innerText,
        ])
      ).toEqual([
        ['H1', 'kbnBootstrapErrorTitle', 'Elastic did not load properly'],
        ['P', 'kbnBootstrapErrorText', 'Please reload this page.'],
        ['BUTTON', 'kbnBootstrapErrorButton', 'Reload'],
      ]);
    });

    test('logs the stylesheet that failed to load', async () => {
      const { consoleError, injectedAssets, failToLoad } = await runBootstrap({
        ...mockParams(),
        jsDependencyPaths: ['/style-1.css', '/js-1'],
      });

      expect(injectedAssets.map(({ tagName, href, src }) => [tagName, href, src])).toEqual([
        ['LINK', '/style-1.css', undefined],
        ['SCRIPT', undefined, '/js-1'],
      ]);
      failToLoad(injectedAssets[0]);

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        'Kibana bootstrap failed: could not load /style-1.css'
      );
    });
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
