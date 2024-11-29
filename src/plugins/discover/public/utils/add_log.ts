/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Conditional (window.ELASTIC_DISCOVER_LOGGER needs to be set to true) logger function
 * @param message - mandatory message to log
 * @param payload - optional object to log
 */

// @ts-expect-error
window.ELASTIC_DISCOVER_LOGGER = 'debug';

export const addLog = (message: string, payload?: unknown) => {
  // @ts-expect-error
  const logger = window?.ELASTIC_DISCOVER_LOGGER;

  if (logger) {
    if (logger === 'debug') {
      // eslint-disable-next-line no-console
      console.log(`[Discover] ${message}`, payload);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Discover] ${message}`);
    }
  }
};
