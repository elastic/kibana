/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
  Global import, so we don't need to remember to import the lib in each file
  https://www.npmjs.com/package/jest-styled-components#global-installation
*/
import '@testing-library/jest-dom';

// uses subpath exports
// eslint-disable-next-line @kbn/imports/no_unresolvable_imports
import 'web-streams-polyfill/polyfill'; // ReadableStream polyfill

// Only override if running in Node and native ReadableStream is available
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  // Use the Node.js global ReadableStream if available (Node 18+)
  try {
    // This will throw if not available
    const nodeReadableStream = require('stream/web').ReadableStream;
    global.ReadableStream = nodeReadableStream;
    if (
      typeof AbortSignal !== 'undefined' &&
      typeof AbortSignal.prototype.throwIfAborted !== 'function'
    ) {
      // Some libraries (e.g., langchain) depend on the WHATWG Streams/AbortSignal API,
      // which defines AbortSignal.prototype.throwIfAborted. This method is not implemented
      // in all Node.js versions or polyfills. We add it here to ensure compatibility with
      // code that expects this method to exist, such as when using ReadableStream with abort signals.
      AbortSignal.prototype.throwIfAborted = function () {
        if (this.aborted) {
          // This is the standard error thrown by throwIfAborted
          throw new DOMException('Aborted', 'AbortError');
        }
      };
    }
  } catch (e) {
    // Node.js ReadableStream not available, using existing polyfill
  }
}

/**
 * Removed in Jest 27/jsdom, used in some transitive dependencies
 */
global.setImmediate = require('core-js/stable/set-immediate');
global.clearImmediate = require('core-js/stable/clear-immediate');
