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
import { TruncateLabelsOption, TruncateLabelsOptionProps } from './truncate_labels';
import { findTestSubject } from '@elastic/eui/lib/test';

describe('TruncateLabelsOption', function () {
  let props: TruncateLabelsOptionProps;
  let component: ReactWrapper<TruncateLabelsOptionProps>;

  beforeAll(() => {
    props = {
      disabled: false,
      value: 20,
      setValue: jest.fn(),
    };
  });

  it('renders an input type number', () => {
    component = mountWithIntl(<TruncateLabelsOption {...props} />);
    expect(findTestSubject(component, 'xyLabelTruncateInput').length).toBe(1);
  });

  it('renders the value on the input number', () => {
    component = mountWithIntl(<TruncateLabelsOption {...props} />);
    const input = findTestSubject(component, 'xyLabelTruncateInput');
    expect(input.props().value).toBe(20);
  });

  it('disables the input if disabled prop is given', () => {
    const newProps = { ...props, disabled: true };
    component = mountWithIntl(<TruncateLabelsOption {...newProps} />);
    const input = findTestSubject(component, 'xyLabelTruncateInput');
    expect(input.props().disabled).toBeTruthy();
  });

  it('should set the new value', () => {
    component = mountWithIntl(<TruncateLabelsOption {...props} />);
    const input = findTestSubject(component, 'xyLabelTruncateInput');
    input.simulate('change', { target: { value: 100 } });
    expect(props.setValue).toHaveBeenCalled();
  });
});
