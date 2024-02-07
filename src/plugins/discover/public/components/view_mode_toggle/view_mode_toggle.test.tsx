/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTab } from '@elastic/eui';
import { VIEW_MODE } from '../../../common/constants';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { DocumentViewModeToggle } from './view_mode_toggle';
import { BehaviorSubject } from 'rxjs';
import { getDiscoverStateMock } from '../../__mocks__/discover_state.mock';
import { DataTotalHits$ } from '../../application/main/services/discover_data_state_container';
import { FetchStatus } from '../../application/types';

describe('Document view mode toggle component', () => {
  const mountComponent = ({
    showFieldStatistics = true,
    viewMode = VIEW_MODE.DOCUMENT_LEVEL,
    isTextBasedQuery = false,
    setDiscoverViewMode = jest.fn(),
  } = {}) => {
    const serivces = {
      uiSettings: {
        get: () => showFieldStatistics,
      },
    };

    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    stateContainer.dataState.data$.totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 10,
    }) as DataTotalHits$;

    return mountWithIntl(
      <KibanaContextProvider services={serivces}>
        <DocumentViewModeToggle
          viewMode={viewMode}
          isTextBasedQuery={isTextBasedQuery}
          stateContainer={stateContainer}
          setDiscoverViewMode={setDiscoverViewMode}
        />
      </KibanaContextProvider>
    );
  };

  it('should render if SHOW_FIELD_STATISTICS is true', () => {
    const component = mountComponent();
    expect(findTestSubject(component, 'dscViewModeToggle').exists()).toBe(true);
    expect(findTestSubject(component, 'discoverQueryTotalHits').exists()).toBe(true);
  });

  it('should not render if SHOW_FIELD_STATISTICS is false', () => {
    const component = mountComponent({ showFieldStatistics: false });
    expect(findTestSubject(component, 'dscViewModeToggle').exists()).toBe(false);
    expect(findTestSubject(component, 'discoverQueryTotalHits').exists()).toBe(true);
  });

  it('should not render if text-based', () => {
    const component = mountComponent({ isTextBasedQuery: true });
    expect(findTestSubject(component, 'dscViewModeToggle').exists()).toBe(false);
    expect(findTestSubject(component, 'discoverQueryTotalHits').exists()).toBe(true);
  });

  it('should set the view mode to VIEW_MODE.DOCUMENT_LEVEL when dscViewModeDocumentButton is clicked', () => {
    const setDiscoverViewMode = jest.fn();
    const component = mountComponent({ setDiscoverViewMode });
    component.find('[data-test-subj="dscViewModeDocumentButton"]').at(0).simulate('click');
    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.DOCUMENT_LEVEL);
  });

  it('should set the view mode to VIEW_MODE.AGGREGATED_LEVEL when dscViewModeFieldStatsButton is clicked', () => {
    const setDiscoverViewMode = jest.fn();
    const component = mountComponent({ setDiscoverViewMode });
    component.find('[data-test-subj="dscViewModeFieldStatsButton"]').at(0).simulate('click');
    expect(setDiscoverViewMode).toHaveBeenCalledWith(VIEW_MODE.AGGREGATED_LEVEL);
  });

  it('should select the Documents tab if viewMode is VIEW_MODE.DOCUMENT_LEVEL', () => {
    const component = mountComponent();
    expect(component.find(EuiTab).at(0).prop('isSelected')).toBe(true);
  });

  it('should select the Field statistics tab if viewMode is VIEW_MODE.AGGREGATED_LEVEL', () => {
    const component = mountComponent({ viewMode: VIEW_MODE.AGGREGATED_LEVEL });
    expect(component.find(EuiTab).at(1).prop('isSelected')).toBe(true);
  });
});
