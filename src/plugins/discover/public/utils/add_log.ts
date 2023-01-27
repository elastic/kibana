/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Conditional (window.ELASTIC_DISCOVER_LOGGER needs to be set to true) logger function
 * @param args
 */
// @ts-expect-error

export const addLog = (...args) => {
  // @ts-expect-error
  if (window?.ELASTIC_DISCOVER_LOGGER) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};
