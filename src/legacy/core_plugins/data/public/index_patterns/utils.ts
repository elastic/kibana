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

import { find, get } from 'lodash';

import { Field } from './fields';
import { getFilterableKbnTypeNames } from '../../../../../plugins/data/public';

import { SavedObjectsClientContract, SimpleSavedObject } from '../../../../../core/public';

export const ILLEGAL_CHARACTERS = 'ILLEGAL_CHARACTERS';
export const CONTAINS_SPACES = 'CONTAINS_SPACES';
export const INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE = ['\\', '/', '?', '"', '<', '>', '|'];
export const INDEX_PATTERN_ILLEGAL_CHARACTERS = INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.concat(
  ' '
);

function findIllegalCharacters(indexPattern: string): string[] {
  const illegalCharacters = INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce(
    (chars: string[], char: string) => {
      if (indexPattern.includes(char)) {
        chars.push(char);
      }
      return chars;
    },
    []
  );

  return illegalCharacters;
}

/**
 * Returns an object matching a given title
 *
 * @param client {SavedObjectsClientContract}
 * @param title {string}
 * @returns {Promise<SimpleSavedObject|undefined>}
 */
export async function findIndexPatternByTitle(
  client: SavedObjectsClientContract,
  title: string
): Promise<SimpleSavedObject<any> | void> {
  if (!title) {
    return Promise.resolve();
  }

  const { savedObjects } = await client.find({
    type: 'index-pattern',
    perPage: 10,
    search: `"${title}"`,
    searchFields: ['title'],
    fields: ['title'],
  });

  return find(
    savedObjects,
    (obj: SimpleSavedObject<any>) => obj.get('title').toLowerCase() === title.toLowerCase()
  );
}

export async function getIndexPatternTitle(
  client: SavedObjectsClientContract,
  indexPatternId: string
): Promise<SimpleSavedObject<any>> {
  const savedObject = (await client.get('index-pattern', indexPatternId)) as SimpleSavedObject<any>;

  if (savedObject.error) {
    throw new Error(`Unable to get index-pattern title: ${savedObject.error.message}`);
  }

  return savedObject.attributes.title;
}

function indexPatternContainsSpaces(indexPattern: string): boolean {
  return indexPattern.includes(' ');
}

export function validateIndexPattern(indexPattern: string) {
  const errors: Record<string, any> = {};

  const illegalCharacters = findIllegalCharacters(indexPattern);

  if (illegalCharacters.length) {
    errors[ILLEGAL_CHARACTERS] = illegalCharacters;
  }

  if (indexPatternContainsSpaces(indexPattern)) {
    errors[CONTAINS_SPACES] = true;
  }

  return errors;
}

const filterableTypes = getFilterableKbnTypeNames();

export function isFilterable(field: Field): boolean {
  return (
    field.name === '_id' ||
    field.scripted ||
    Boolean(field.searchable && filterableTypes.includes(field.type))
  );
}

export function getFromSavedObject(savedObject: any) {
  if (get(savedObject, 'attributes.fields') === undefined) {
    return;
  }

  return {
    id: savedObject.id,
    fields: JSON.parse(savedObject.attributes.fields),
    title: savedObject.attributes.title,
  };
}

export function getRoutes() {
  return {
    edit: '/management/kibana/index_patterns/{{id}}',
    addField: '/management/kibana/index_patterns/{{id}}/create-field',
    indexedFields: '/management/kibana/index_patterns/{{id}}?_a=(tab:indexedFields)',
    scriptedFields: '/management/kibana/index_patterns/{{id}}?_a=(tab:scriptedFields)',
    sourceFilters: '/management/kibana/index_patterns/{{id}}?_a=(tab:sourceFilters)',
  };
}
