/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { DiscoverField } from './discover_field';
import { DataViewField } from '../../../../../../data_views/public';
import { KibanaContextProvider } from '../../../../../../kibana_react/public';
import { stubDataView } from '../../../../../../data_views/common/data_view.stub';

jest.mock('../../../../kibana_services', () => ({
  getUiActions: jest.fn(() => {
    return {
      getTriggerCompatibleActions: jest.fn(() => []),
    };
  }),
}));

function getComponent({
  selected = false,
  showDetails = false,
  field,
}: {
  selected?: boolean;
  showDetails?: boolean;
  field?: DataViewField;
}) {
  const finalField =
    field ??
    new DataViewField({
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      count: 10,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });

  const props = {
    indexPattern: stubDataView,
    field: finalField,
    getDetails: jest.fn(() => ({ buckets: [], error: '', exists: 1, total: 2, columns: [] })),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    showDetails,
    selected,
  };
  const services = {
    history: () => ({
      location: {
        search: '',
      },
    }),
    capabilities: {
      visualize: {
        show: true,
      },
    },
    uiSettings: {
      get: (key: string) => {
        if (key === 'fields:popularLimit') {
          return 5;
        }
      },
    },
  };
  const comp = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverField {...props} />
    </KibanaContextProvider>
  );
  return { comp, props };
}

describe('discover sidebar field', function () {
  it('should allow selecting fields', function () {
    const { comp, props } = getComponent({});
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    const { comp, props } = getComponent({ selected: true });
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('bytes');
  });
  it('should trigger getDetails', function () {
    const { comp, props } = getComponent({ selected: true });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails).toHaveBeenCalledWith(props.field);
  });
  it('should not allow clicking on _source', function () {
    const field = new DataViewField({
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const { comp, props } = getComponent({
      selected: true,
      field,
    });
    findTestSubject(comp, 'field-_source-showDetails').simulate('click');
    expect(props.getDetails).not.toHaveBeenCalled();
  });
  it('displays warning for conflicting fields', function () {
    const field = new DataViewField({
      name: 'troubled_field',
      type: 'conflict',
      esTypes: ['integer', 'text'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    });
    const { comp } = getComponent({
      selected: true,
      field,
    });
    const dscField = findTestSubject(comp, 'field-troubled_field-showDetails');
    expect(dscField.find('.kbnFieldButton__infoIcon').length).toEqual(1);
  });
  it('should not execute getDetails when rendered, since it can be expensive', function () {
    const { props } = getComponent({});
    expect(props.getDetails.mock.calls.length).toEqual(0);
  });
  it('should execute getDetails when show details is requested', function () {
    const { props, comp } = getComponent({});
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails.mock.calls.length).toEqual(1);
  });
});
