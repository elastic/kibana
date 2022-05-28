/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { HitsCounter, HitsCounterProps } from './hits_counter';
import { findTestSubject } from '@elastic/eui/lib/test';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import { DataTotalHits$ } from '../../utils/use_saved_search';

describe('hits counter', function () {
  let props: HitsCounterProps;
  let component: ReactWrapper<HitsCounterProps>;

  beforeAll(() => {
    props = {
      onResetQuery: jest.fn(),
      showResetButton: true,
      savedSearchData$: new BehaviorSubject({
        fetchStatus: FetchStatus.COMPLETE,
        result: 2,
      }) as DataTotalHits$,
    };
  });

  it('HitsCounter renders a button by providing the showResetButton property', () => {
    component = mountWithIntl(<HitsCounter {...props} />);
    expect(findTestSubject(component, 'resetSavedSearch').length).toBe(1);
  });

  it('HitsCounter not renders a button when the showResetButton property is false', () => {
    component = mountWithIntl(<HitsCounter {...props} showResetButton={false} />);
    expect(findTestSubject(component, 'resetSavedSearch').length).toBe(0);
  });

  it('expect to render the number of hits', function () {
    component = mountWithIntl(<HitsCounter {...props} />);
    const hits = findTestSubject(component, 'discoverQueryHits');
    expect(hits.text()).toBe('2');
  });

  it('expect to render 1,899 hits if 1899 hits given', function () {
    const data$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: 1899,
    }) as DataTotalHits$;
    component = mountWithIntl(
      <HitsCounter
        {...props}
        savedSearchData$={data$}
        showResetButton={false}
        onResetQuery={jest.fn()}
      />
    );
    const hits = findTestSubject(component, 'discoverQueryHits');
    expect(hits.text()).toBe('1,899');
  });

  it('should reset query', function () {
    component = mountWithIntl(<HitsCounter {...props} />);
    findTestSubject(component, 'resetSavedSearch').simulate('click');
    expect(props.onResetQuery).toHaveBeenCalled();
  });
});
