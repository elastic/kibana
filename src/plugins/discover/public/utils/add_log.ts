/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const addLog = (function () {
  // @ts-expect-error
  if (window?.ELASTIC_DISCOVER_LOGGER) {
    // console.log(message, payload);
    // eslint-disable-next-line no-console
    return Function.prototype.bind.call(console.log, console);
  }
  return () => void 0;
})();
