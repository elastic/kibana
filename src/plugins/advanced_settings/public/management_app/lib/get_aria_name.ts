/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { words } from 'lodash';

import { Query } from '@elastic/eui';

import { CATEGORY_FIELD } from '../components/search/search';

const mapWords = (name?: string): string =>
  words(name ?? '')
    .map((word) => word.toLowerCase())
    .join(' ');

/**
 * @name {string} the name of the configuration object
 * @returns {string} a space delimited, lowercase string with
 *          special characters removed.
 *
 * Examples:
 * - `xPack:fooBar:foo_bar_baz` -> `x pack foo bar foo bar baz`
 * - `xPack:fooBar:foo_bar_baz category:(general)` -> `x pack foo bar foo bar baz category:(general)`
 */
export function getAriaName(name?: string) {
  if (!name) {
    return '';
  }

  const query = Query.parse(name);

  if (query.hasOrFieldClause(CATEGORY_FIELD)) {
    const categories = query.getOrFieldClause(CATEGORY_FIELD);
    const termValue = mapWords(query.removeOrFieldClauses(CATEGORY_FIELD).text);

    if (!categories || !Array.isArray(categories.value)) {
      return termValue;
    }

    let categoriesQuery = Query.parse('');
    categories.value.forEach((v) => {
      categoriesQuery = categoriesQuery.addOrFieldValue(CATEGORY_FIELD, v);
    });

    return `${termValue} ${categoriesQuery.text}`;
  }

  return mapWords(name);
}
