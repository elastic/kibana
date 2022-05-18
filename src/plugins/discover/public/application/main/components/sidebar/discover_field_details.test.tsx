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

import { DiscoverFieldDetails } from './discover_field_details';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

describe('discover sidebar field details', function () {
  const onAddFilter = jest.fn();
  const defaultProps = {
    indexPattern: stubDataView,
    details: { buckets: [], error: '', exists: 1, total: 2, columns: [] },
    onAddFilter,
  };

  function mountComponent(field: DataViewField) {
    const compProps = { ...defaultProps, field };
    return mountWithIntl(<DiscoverFieldDetails {...compProps} />);
  }

  it('click on addFilter calls the function', function () {
    const visualizableField = new DataViewField({
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      count: 10,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const component = mountComponent(visualizableField);
    const onAddButton = findTestSubject(component, 'onAddFilterButton');
    onAddButton.simulate('click');
    expect(onAddFilter).toHaveBeenCalledWith('_exists_', visualizableField.name, '+');
  });
});
