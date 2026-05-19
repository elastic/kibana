/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @jest-environment jsdom */

const Fs = require('fs');
const Path = require('path');
const Module = require('module');
const { TextDecoder, TextEncoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

const { JSDOM } = require('jsdom');

// jest_node drops testEnvironment; seed JSDOM globals so the browser bundle sees document/window.
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.history = dom.window.history;

const HMR_CLIENT_PATH = Path.resolve(__dirname, 'hmr_client.js');

function loadHmrClient(overrides = {}) {
  const hot = {
    // Non-empty so the client does not fall through to window.location.reload()
    check: jest.fn().mockResolvedValue(['./some-module.js']),
    ...overrides.hot,
  };

  const m = new Module(HMR_CLIENT_PATH, module);
  m.filename = HMR_CLIENT_PATH;
  m.paths = Module._nodeModulePaths(Path.dirname(HMR_CLIENT_PATH));
  m.hot = hot;

  const source = Fs.readFileSync(HMR_CLIENT_PATH, 'utf8');
  // Avoid Module._compile: vm context may not share the same `global` as this file's JSDOM.
  // eslint-disable-next-line no-new-func -- explicit document/window/module injection for browser bundle
  const run = new Function('document', 'window', 'module', source);
  run(global.document, global.window, m);

  return { module: m, hot };
}

describe('hmr_client', () => {
  let eventSourceInstances;
  let OriginalEventSource;

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });

    global.__KBN_HMR_PORT__ = 12345;
    global.__webpack_hash__ = 'hash-a';
    global.window.__kbnHmrActive__ = true;

    global.MutationObserver = class {
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };

    eventSourceInstances = [];
    OriginalEventSource = global.EventSource;
    global.EventSource = jest.fn().mockImplementation(() => {
      const inst = {
        onmessage: null,
        onerror: null,
        close: jest.fn(),
      };
      eventSourceInstances.push(inst);
      return inst;
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    global.EventSource = OriginalEventSource;
    delete global.__KBN_HMR_PORT__;
    delete global.__webpack_hash__;
    delete global.window.__kbnHmrActive__;

    jest.restoreAllMocks();

    document.getElementById('__kbn_hmr_indicator__')?.remove();
    document.getElementById('__kbn_hmr_indicator_styles__')?.remove();
    document.getElementById('__kbn_hmr_error_overlay__')?.remove();
    document.body.replaceChildren();
    document.head.querySelectorAll('style').forEach((n) => n.remove());
  });

  it('constructs EventSource against localhost and HMR port', () => {
    loadHmrClient();
    expect(EventSource).toHaveBeenCalledWith('http://localhost:12345/');
  });

  it('skips module.hot.check when hash matches __webpack_hash__ (upToDate)', async () => {
    const { hot } = loadHmrClient();
    const source = eventSourceInstances[0];

    source.onmessage({
      data: JSON.stringify({ hash: 'hash-a', time: 1, files: [] }),
    });

    await Promise.resolve();

    expect(hot.check).not.toHaveBeenCalled();
  });

  it('invokes module.hot.check when hash differs from __webpack_hash__', async () => {
    const { hot } = loadHmrClient();
    const source = eventSourceInstances[0];

    source.onmessage({
      data: JSON.stringify({ hash: 'hash-b', time: 0.5, files: ['src/foo.ts'] }),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(hot.check).toHaveBeenCalledWith({ ignoreDeclined: true, ignoreUnaccepted: true });
  });

  it('handles building SSE without invoking check', async () => {
    const { hot } = loadHmrClient();
    const source = eventSourceInstances[0];

    source.onmessage({
      data: JSON.stringify({ building: true }),
    });

    await Promise.resolve();

    expect(hot.check).not.toHaveBeenCalled();
  });

  it('handles errors SSE: logs, shows overlay when not replay, sets error state', async () => {
    loadHmrClient();
    const source = eventSourceInstances[0];

    source.onmessage({
      data: JSON.stringify({ errors: ['line 1'], replay: false }),
    });

    await Promise.resolve();

    expect(console.error).toHaveBeenCalled();
    expect(document.getElementById('__kbn_hmr_error_overlay__')).not.toBeNull();
  });

  it('handles errors SSE with replay: stores errors without overlay', async () => {
    loadHmrClient();
    const source = eventSourceInstances[0];

    source.onmessage({
      data: JSON.stringify({ errors: ['e1'], replay: true }),
    });

    await Promise.resolve();

    expect(document.getElementById('__kbn_hmr_error_overlay__')).toBeNull();
  });

  it('handles basePath when wasDisconnected: triggers reload path when base path matches', async () => {
    window.history.pushState({}, '', '/old/app');

    loadHmrClient();
    const source = eventSourceInstances[0];

    source.onerror();
    expect(source.close).toHaveBeenCalled();

    source.onmessage({
      data: JSON.stringify({ basePath: '/old' }),
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Server restarted, reloading page')
    );
  });

  it('handles hash message: clears overlay and runs hot check pipeline', async () => {
    const { hot } = loadHmrClient();
    const source = eventSourceInstances[0];

    source.onmessage({
      data: JSON.stringify({ errors: ['x'], replay: false }),
    });
    await Promise.resolve();
    expect(document.getElementById('__kbn_hmr_error_overlay__')).not.toBeNull();

    source.onmessage({
      data: JSON.stringify({ hash: 'hash-b', time: 0.1, files: ['a.js'] }),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById('__kbn_hmr_error_overlay__')).toBeNull();
    expect(hot.check).toHaveBeenCalledWith({ ignoreDeclined: true, ignoreUnaccepted: true });
  });

  it('does not initialize when __kbnHmrActive__ is falsy', () => {
    delete global.window.__kbnHmrActive__;
    loadHmrClient();
    expect(EventSource).not.toHaveBeenCalled();
    expect(document.getElementById('__kbn_hmr_indicator__')).toBeNull();
  });
});
