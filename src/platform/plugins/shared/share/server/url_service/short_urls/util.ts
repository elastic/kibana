/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This function escapes reserved characters as listed here:
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
 */
export const escapeSearchReservedChars = (str: string) => {
  return str.replace(/[-=&|!{}()\[\]^"~*?:\\\/\+]+/g, '\\$&');
};

/**
 * Allows only characters in slug that can appear as a part of a URL.
 */
export const validateSlug = (slug: string) => {
  const regex = /^[a-zA-Z0-9\.\-\_]{3,255}$/;
  if (!regex.test(slug)) {
    throw new Error(`Invalid [slug = ${slug}].`);
  }
};
