/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { HitsCounter, HitsCounterProps } from './hits_counter';
import { findTestSubject } from '@elastic/eui/lib/test';

describe('hits counter', function () {
  let props: HitsCounterProps;
  let component: ReactWrapper<HitsCounterProps>;

  beforeAll(() => {
    props = {
      onResetQuery: jest.fn(),
      showResetButton: true,
      hits: 2,
    };
  });

  it('HitsCounter renders a button by providing the showResetButton property', () => {
    component = mountWithIntl(<HitsCounter {...props} />);
    expect(findTestSubject(component, 'resetSavedSearch').length).toBe(1);
  });

  it('HitsCounter not renders a button when the showResetButton property is false', () => {
    component = mountWithIntl(
      <HitsCounter hits={2} showResetButton={false} onResetQuery={jest.fn()} />
    );
    expect(findTestSubject(component, 'resetSavedSearch').length).toBe(0);
  });

  it('expect to render the number of hits', function () {
    component = mountWithIntl(<HitsCounter {...props} />);
    const hits = findTestSubject(component, 'discoverQueryHits');
    expect(hits.text()).toBe('2');
  });

  it('expect to render 1,899 hits if 1899 hits given', function () {
    component = mountWithIntl(
      <HitsCounter hits={1899} showResetButton={false} onResetQuery={jest.fn()} />
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
