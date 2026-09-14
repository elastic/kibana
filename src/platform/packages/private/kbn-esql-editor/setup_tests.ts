/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import '@testing-library/jest-dom';

// Monaco 0.54.0 Delayer.cancel() rejects its completionPromise with CancellationError when
// WordHighlighter disposes during model disposal. WordHighlighter doesn't attach .catch() to
// the Delayer promise, so the rejection surfaces as unhandled and fails tests.
//
// Jest-circus registers its 'unhandledRejection' listener AFTER setupFilesAfterFramework runs,
// so any listener-based filtering is bypassed. The correct fix is to patch Delayer.prototype.cancel
// to leave the promise pending (do not reject) instead of rejecting with CancellationError.
// This eliminates the unhandled rejection at the source without affecting Monaco's public API.
//
// This is a workaround for an upstream Monaco bug. No tracking issue exists in the Monaco repo
// as of the time of this upgrade; check https://github.com/microsoft/monaco-editor/issues when
// upgrading Monaco again to see if a fix has landed.
beforeAll(() => {
  const monacoAsync = jest.requireActual('monaco-editor/esm/vs/base/common/async') as {
    Delayer?: { prototype?: any };
  };
  if (monacoAsync?.Delayer?.prototype) {
    monacoAsync.Delayer.prototype.cancel = function () {
      this.cancelTimeout();
      if (this.completionPromise) {
        // Leave the promise pending rather than rejecting — the promise object is
        // no longer reachable (refs nulled), so it will be GC'd. No rejection = no
        // unhandled CancellationError from WordHighlighter cleanup during test teardown.
        this.completionPromise = null;
        this.doReject = null;
        this.doResolve = null;
      }
    };
  }
});

// JSDOM has no navigator.clipboard. Monaco 0.54.0's WebKit clipboard workaround calls
// navigator.clipboard.write() from a click/keydown listener on the editor container,
// so we provide a minimal stub to keep that handler from throwing.
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([]),
  },
  configurable: true,
});
