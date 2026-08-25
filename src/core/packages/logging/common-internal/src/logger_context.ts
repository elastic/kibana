/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Separator string that used within nested context name (eg. plugins.pid).
 */
export const CONTEXT_SEPARATOR = '.';

/**
 * Name of the `root` context that always exists and sits at the top of logger hierarchy.
 */
export const ROOT_CONTEXT_NAME = 'root';

/**
 * Name of the appender that is always presented and used by `root` logger by default.
 */
export const DEFAULT_APPENDER_NAME = 'default';

/**
 * Helper method that joins separate string context parts into single context string.
 * In case joined context is an empty string, `root` context name is returned.
 * @param contextParts List of the context parts (e.g. ['parent', 'child'].
 * @returns {string} Joined context string (e.g. 'parent.child').
 */
export const getLoggerContext = (contextParts: string[]): string => {
  return contextParts.join(CONTEXT_SEPARATOR) || ROOT_CONTEXT_NAME;
};

/**
 * Helper method that returns parent context for the specified one.
 * @param context Context to find parent for.
 * @returns Name of the parent context or `root` if the context is the top level one.
 */
export const getParentLoggerContext = (context: string): string => {
  const lastIndexOfSeparator = context.lastIndexOf(CONTEXT_SEPARATOR);
  if (lastIndexOfSeparator === -1) {
    return ROOT_CONTEXT_NAME;
  }

  return context.slice(0, lastIndexOfSeparator);
};
