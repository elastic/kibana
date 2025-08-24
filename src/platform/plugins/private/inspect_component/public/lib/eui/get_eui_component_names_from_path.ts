/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Extract EUI component names from a given component path string.
 * This function extracts and returns an array of EUI component names found in the path.
 * @param {string} value The component path string.
 * @return {string[]} An array of EUI component names found in the path.
 */
export const getEuiComponentNamesFromPath = (value: string): string[] => {
  if (!value) return [];

  const euiComponentPart = value.includes(':') ? value.split(':').slice(1).join(':') : value;

  return euiComponentPart
    .split('>')
    .map((t) => t.trim())
    .filter((t) => t.startsWith('Eui'));
};
