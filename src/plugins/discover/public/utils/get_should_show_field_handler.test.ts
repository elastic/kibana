/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { getShouldShowFieldHandler } from './get_should_show_field_handler';

describe('get fields to show', () => {
  let dataView: DataView;
  const dataViewFields: Record<string, DataViewField> = {
    'machine.os': {
      name: 'machine.os',
      esTypes: ['text'],
      type: 'string',
      aggregatable: false,
      searchable: false,
      filterable: true,
    } as DataViewField,
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
    } as DataViewField,
    acknowledged: {
      name: 'acknowledged',
      type: 'boolean',
      esTypes: ['boolean'],
      aggregatable: true,
      searchable: true,
      filterable: true,
    } as DataViewField,
    bytes: {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
      filterable: true,
    } as DataViewField,
    clientip: {
      name: 'clientip',
      type: 'ip',
      esTypes: ['ip'],
      aggregatable: true,
      searchable: true,
      filterable: true,
    } as DataViewField,
  };
  const stubDataView = {
    id: 'logstash-*',
    fields: Object.keys(dataViewFields).map((key) => dataViewFields[key]),
    title: 'logstash-*',
    timeFieldName: '@timestamp',
    getTimeField: () => ({ name: '@timestamp', type: 'date' }),
  };

  beforeEach(() => {
    dataView = stubDataView as DataView;
    dataView.fields.getByName = (name) => dataViewFields[name];
  });

  it('shows multifields when showMultiFields is true', () => {
    const shouldShowFieldHandler = getShouldShowFieldHandler(
      ['machine.os', 'machine.os.raw', 'clientip'],
      dataView,
      true
    );
    expect(shouldShowFieldHandler('machine.os')).toBe(true);
    expect(shouldShowFieldHandler('machine.os.raw')).toBe(true);
    expect(shouldShowFieldHandler('clientip')).toBe(true);
  });

  it('do not show multifields when showMultiFields is false', () => {
    const shouldShowFieldHandler = getShouldShowFieldHandler(
      ['machine.os', 'machine.os.raw', 'acknowledged', 'clientip'],
      dataView,
      false
    );
    expect(shouldShowFieldHandler('acknowledged')).toBe(true);
    expect(shouldShowFieldHandler('clientip')).toBe(true);
    expect(shouldShowFieldHandler('machine.os')).toBe(true);
    expect(shouldShowFieldHandler('machine.os.raw')).toBe(false);
  });

  it('show multifields when showMultiFields is false but parent is not present', () => {
    const shouldShowFieldHandler = getShouldShowFieldHandler(['machine.os.raw'], dataView, false);
    expect(shouldShowFieldHandler('machine.os.raw')).toBe(true);
  });

  it('show unmapped fields', () => {
    let shouldShowFieldHandler = getShouldShowFieldHandler(['unmapped'], dataView, false);
    expect(shouldShowFieldHandler('unmapped')).toBe(true);
    shouldShowFieldHandler = getShouldShowFieldHandler(['unmapped'], dataView, true);
    expect(shouldShowFieldHandler('unmapped')).toBe(true);
  });
});
