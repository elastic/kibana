/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern, IndexPatternField } from '../../../../data/common';
import { getFieldsToShow } from './get_fields_to_show';

describe('get fields to show', () => {
  let indexPattern: IndexPattern;
  const indexPatternFields: Record<string, IndexPatternField> = {
    'machine.os': {
      name: 'machine.os',
      esTypes: ['text'],
      type: 'string',
      aggregatable: false,
      searchable: false,
      filterable: true,
    } as IndexPatternField,
    'machine.os.raw': {
      name: 'machine.os.raw',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
      filterable: true,
      spec: {
        subType: {
          multi: {
            parent: 'machine.os',
          },
        },
      },
    } as IndexPatternField,
    acknowledged: {
      name: 'acknowledged',
      type: 'boolean',
      esTypes: ['boolean'],
      aggregatable: true,
      searchable: true,
      filterable: true,
    } as IndexPatternField,
    bytes: {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
      filterable: true,
    } as IndexPatternField,
    clientip: {
      name: 'clientip',
      type: 'ip',
      esTypes: ['ip'],
      aggregatable: true,
      searchable: true,
      filterable: true,
    } as IndexPatternField,
  };
  const stubIndexPattern = {
    id: 'logstash-*',
    fields: Object.keys(indexPatternFields).map((key) => indexPatternFields[key]),
    title: 'logstash-*',
    timeFieldName: '@timestamp',
    getTimeField: () => ({ name: '@timestamp', type: 'date' }),
  };

  beforeEach(() => {
    indexPattern = stubIndexPattern as IndexPattern;
    indexPattern.fields.getByName = (name) => indexPatternFields[name];
  });

  it('shows multifields when showMultiFields is true', () => {
    const fieldsToShow = getFieldsToShow(
      ['machine.os', 'machine.os.raw', 'clientip'],
      indexPattern,
      true
    );
    expect(fieldsToShow).toEqual(['machine.os', 'machine.os.raw', 'clientip']);
  });

  it('do not show multifields when showMultiFields is false', () => {
    const fieldsToShow = getFieldsToShow(
      ['machine.os', 'machine.os.raw', 'acknowledged', 'clientip'],
      indexPattern,
      false
    );
    expect(fieldsToShow).toEqual(['machine.os', 'acknowledged', 'clientip']);
  });
});
