/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { MetricSeries } from './series';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

jest.mock('plugins/data', () => {
  return {
    QueryStringInput: () => <div className="queryStringInput" />,
  };
});

const defaultProps = {
  disableAdd: false,
  disableDelete: true,
  dragHandleProps: {},
  toggleVisible: jest.fn(),
  onAdd: jest.fn(),
  onChange: jest.fn(),
  onClone: jest.fn(),
  onDelete: jest.fn(),
};

describe('MetricSeries', () => {
  it('should enable add data', () => {
    const wrapper = mountWithIntl(<MetricSeries.WrappedComponent {...defaultProps} />);
    const props = wrapper.props();

    expect(props.disableAdd).toBeFalsy();
  });

  it('should disable delete data', () => {
    const wrapper = mountWithIntl(<MetricSeries.WrappedComponent {...defaultProps} />);
    const props = wrapper.props();
    expect(props.disableDelete).toBeTruthy();
  });

  it('should call toggleVisible function', () => {
    const wrapper = mountWithIntl(<MetricSeries.WrappedComponent {...defaultProps} />);
    wrapper
      .find('EuiButtonIcon')
      .at(0)
      .simulate('click');
    expect(defaultProps.toggleVisible).toBeCalled();
  });

  it('should call onAdd function', () => {
    const wrapper = mountWithIntl(<MetricSeries.WrappedComponent {...defaultProps} />);
    wrapper
      .find('EuiButtonIcon')
      .at(3)
      .simulate('click');
    expect(defaultProps.onAdd).toBeCalled();
  });
});
