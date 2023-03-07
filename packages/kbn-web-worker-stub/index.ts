/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

if (!window.Worker) {
  // @ts-expect-error we aren't honoring the real Worker spec here
  window.Worker = function Worker() {
    this.postMessage = jest.fn();

    // @ts-expect-error TypeScript doesn't think this exists on the Worker interface
    // https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
    this.terminate = jest.fn();
  };
}

export {};
