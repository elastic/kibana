/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CONSUMER_SUFFIX_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;

/**
 * Prefixes a plugin-local consumer name with the plugin id.
 * The suffix cannot contain a dot, so a plugin cannot claim another plugin's prefix.
 *
 * @public
 */
export const scopeConsumerName = (pluginName: string, consumer: string): string => {
  if (!CONSUMER_SUFFIX_PATTERN.test(consumer)) {
    throw new Error(
      `Consumer name "${consumer}" is invalid. Use a letter followed by letters, numbers, "_" or "-".`
    );
  }

  return `${pluginName}.${consumer}`;
};
