/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
