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

// @ts-ignore
import { get } from 'lodash';
// @ts-ignore
import { KBN_FIELD_TYPES } from '../../../../utils/kbn_field_types';
import { Field, FieldType } from './fields';
import { StaticIndexPattern } from './index_patterns';

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

const filterableTypes = KBN_FIELD_TYPES.filter((type: any) => type.filterable).map(
  (type: any) => type.name
);

export function isFilterable(field: Field): boolean {
  return (
    field.name === '_id' ||
    field.scripted ||
    (field.searchable && filterableTypes.includes(field.type))
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

export const mockFields: FieldType[] = [
  {
    name: 'machine.os',
    esTypes: ['text'],
    type: 'string',
    aggregatable: false,
    searchable: false,
    filterable: true,
  },
  {
    name: 'machine.os.raw',
    type: 'string',
    esTypes: ['keyword'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'not.filterable',
    type: 'string',
    esTypes: ['text'],
    aggregatable: true,
    searchable: false,
    filterable: false,
  },
  {
    name: 'bytes',
    type: 'number',
    esTypes: ['long'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: '@timestamp',
    type: 'date',
    esTypes: ['date'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'clientip',
    type: 'ip',
    esTypes: ['ip'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
  {
    name: 'bool.field',
    type: 'boolean',
    esTypes: ['boolean'],
    aggregatable: true,
    searchable: true,
    filterable: true,
  },
];

export const mockIndexPattern: StaticIndexPattern = {
  id: 'logstash-*',
  fields: mockFields,
  title: 'logstash-*',
  timeFieldName: '@timestamp',
};
