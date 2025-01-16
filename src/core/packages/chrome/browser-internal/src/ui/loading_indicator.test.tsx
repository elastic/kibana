/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { BehaviorSubject } from 'rxjs';

import { LoadingIndicator } from './loading_indicator';

describe('kbnLoadingIndicator', () => {
  it('is hidden by default', () => {
    const wrapper = shallow(<LoadingIndicator loadingCount$={new BehaviorSubject(0)} />);
    expect(
      wrapper.findWhere((node) => node.prop('data-test-subj') === 'globalLoadingIndicator-hidden')
    ).toHaveLength(1);
    expect(wrapper).toMatchSnapshot();
  });

  it('is visible when loadingCount is > 0', () => {
    const wrapper = shallow(<LoadingIndicator loadingCount$={new BehaviorSubject(1)} />);
    // Pause the check beyond the 250ms delay that it has
    setTimeout(() => {
      expect(wrapper.prop('data-test-subj')).toBe('globalLoadingIndicator');
    }, 300);
    expect(wrapper).toMatchSnapshot();
  });

  it('shows logo image when customLogo is set', () => {
    const wrapper = shallow(
      <LoadingIndicator loadingCount$={new BehaviorSubject(1)} customLogo={'customLogo'} />
    );
    // Pause the check beyond the 250ms delay that it has
    setTimeout(() => {
      expect(wrapper.prop('data-test-subj')).toBe('globalLoadingIndicator');
    }, 300);
    expect(wrapper).toMatchSnapshot();
  });
});
