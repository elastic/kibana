/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Utility to remove trailing, leading or duplicate slashes.
 * By default will only remove duplicates.
 */
export const removeSlashes = (
  url: string,
  {
    trailing = false,
    leading = false,
    duplicates = true,
  }: { trailing?: boolean; leading?: boolean; duplicates?: boolean } = {}
): string => {
  if (duplicates) {
    url = url.replace(/\/{2,}/g, '/');
  }
  if (trailing) {
    url = url.replace(/\/$/, '');
  }
  if (leading) {
    url = url.replace(/^\//, '');
  }
  return url;
};
