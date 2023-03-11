/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiLoadingSpinner } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { DiscoverFieldDetails } from './discover_field_details';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { stubDataView, stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../../types';
import { DataDocuments$ } from '../../../services/discover_data_state_container';
import { getDataTableRecords } from '../../../../../__fixtures__/real_hits';

describe('discover sidebar field details', function () {
  const onAddFilter = jest.fn();
  const defaultProps = {
    dataView: stubDataView,
    details: { buckets: [], error: '', exists: 1, total: 2, columns: [] },
    onAddFilter,
  };
  const hits = getDataTableRecords(stubLogstashDataView);
  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: hits,
  }) as DataDocuments$;

  function mountComponent(field: DataViewField) {
    const compProps = { ...defaultProps, field, documents$ };
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

  it('should stay in sync with documents$ state', async function () {
    const testDocuments$ = new BehaviorSubject({
      fetchStatus: FetchStatus.LOADING,
    }) as DataDocuments$;
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
    let component: ReactWrapper;

    await act(async () => {
      component = await mountWithIntl(
        <DiscoverFieldDetails
          {...defaultProps}
          field={visualizableField}
          documents$={testDocuments$}
        />
      );
    });

    expect(component!.find(EuiLoadingSpinner).exists()).toBeTruthy();

    await act(async () => {
      testDocuments$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: hits,
      });
    });

    await component!.update();

    expect(component!.find(EuiLoadingSpinner).exists()).toBeFalsy();
    expect(
      findTestSubject(component!, `discoverFieldDetails-${visualizableField.name}`).exists()
    ).toBeTruthy();

    await act(async () => {
      testDocuments$.next({
        fetchStatus: FetchStatus.UNINITIALIZED,
      });
    });

    await component!.update();

    expect(component!.isEmptyRender()).toBeTruthy();
  });
});
