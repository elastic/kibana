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
import { mount, shallow } from 'enzyme';
import { YExtents, YExtentsProps } from './y_extents';
import { ScaleTypes } from '../../../utils/collections';
import { NumberInputOption } from '../../common';

describe('YExtents component', () => {
  let setMultipleValidity: jest.Mock;
  let setScale: jest.Mock;
  let defaultProps: YExtentsProps;
  const Y_EXTENTS = 'yExtents';

  beforeEach(() => {
    setMultipleValidity = jest.fn();
    setScale = jest.fn();

    defaultProps = {
      scale: {
        type: ScaleTypes.LINEAR,
      },
      setMultipleValidity,
      setScale,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<YExtents {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should call setMultipleValidity with true when min and max are not defined', () => {
    mount(<YExtents {...defaultProps} />);

    expect(setMultipleValidity).toBeCalledWith(Y_EXTENTS, true);
  });

  it('should call setMultipleValidity with true when min less than max', () => {
    defaultProps.scale.min = 1;
    defaultProps.scale.max = 2;
    mount(<YExtents {...defaultProps} />);

    expect(setMultipleValidity).toBeCalledWith(Y_EXTENTS, true);
  });

  it('should call setMultipleValidity with false when min greater than max', () => {
    defaultProps.scale.min = 1;
    defaultProps.scale.max = 0;
    mount(<YExtents {...defaultProps} />);

    expect(setMultipleValidity).toBeCalledWith(Y_EXTENTS, false);
  });

  it('should call setMultipleValidity with false when min equals max', () => {
    defaultProps.scale.min = 1;
    defaultProps.scale.max = 1;
    mount(<YExtents {...defaultProps} />);

    expect(setMultipleValidity).toBeCalledWith(Y_EXTENTS, false);
  });

  it('should call setMultipleValidity with false when min equals 0 and scale is log', () => {
    defaultProps.scale.min = 0;
    defaultProps.scale.max = 1;
    defaultProps.scale.type = ScaleTypes.LOG;
    mount(<YExtents {...defaultProps} />);

    expect(setMultipleValidity).toBeCalledWith(Y_EXTENTS, false);
  });

  it('should call setScale with input number', () => {
    const inputNumber = 5;
    const comp = shallow(<YExtents {...defaultProps} />);
    const inputProps = comp
      .find(NumberInputOption)
      .first()
      .props();
    inputProps.setValue(Y_EXTENTS, inputNumber);

    expect(setScale).toBeCalledWith(Y_EXTENTS, inputNumber);
  });

  it('should call setScale with null when input is empty', () => {
    const comp = shallow(<YExtents {...defaultProps} />);
    const inputProps = comp
      .find(NumberInputOption)
      .first()
      .props();
    inputProps.setValue(Y_EXTENTS, '');

    expect(setScale).toBeCalledWith(Y_EXTENTS, null);
  });
});
