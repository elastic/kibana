/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec, IndexPatternField } from '.';

export const createIndexPatternFieldStub = ({ spec }: { spec: FieldSpec }): IndexPatternField => {
  return new IndexPatternField(spec);
};

export const stubFields: IndexPatternField[] = [
  createIndexPatternFieldStub({
    spec: {
      name: 'machine.os',
      esTypes: ['text'],
      type: 'string',
      aggregatable: false,
      searchable: false,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: 'machine.os.raw',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: 'not.filterable',
      type: 'string',
      esTypes: ['text'],
      aggregatable: true,
      searchable: false,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: '@timestamp',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: 'clientip',
      type: 'ip',
      esTypes: ['ip'],
      aggregatable: true,
      searchable: true,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: 'bool.field',
      type: 'boolean',
      esTypes: ['boolean'],
      aggregatable: true,
      searchable: true,
    },
  }),
  createIndexPatternFieldStub({
    spec: {
      name: 'bytes_range',
      type: 'number_range',
      esTypes: ['integer_range'],
      aggregatable: true,
      searchable: true,
    },
  }),
];

export const stubFieldSpecMap: Record<string, FieldSpec> = stubFields
  .map((f) => f.toSpec())
  .reduce((fieldsMap, field) => {
    fieldsMap![field.name] = field;
    return fieldsMap;
  }, {} as Record<string, FieldSpec>);
