/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { ScaleType } from '../../../../types';
import { YExtents, YExtentsProps } from './y_extents';
import { NumberInputOption } from '@kbn/vis-default-editor-plugin/public';

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
        type: ScaleType.Linear,
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
    defaultProps.scale.type = ScaleType.Log;
    mount(<YExtents {...defaultProps} />);

    expect(setMultipleValidity).toBeCalledWith(Y_EXTENTS, false);
  });

  it('should call setScale with input number', () => {
    const inputNumber = 5;
    const comp = shallow(<YExtents {...defaultProps} />);
    const inputProps = comp.find(NumberInputOption).first().props();
    inputProps.setValue(Y_EXTENTS, inputNumber);

    expect(setScale).toBeCalledWith(Y_EXTENTS, inputNumber);
  });

  it('should call setScale with null when input is empty', () => {
    const comp = shallow(<YExtents {...defaultProps} />);
    const inputProps = comp.find(NumberInputOption).first().props();
    inputProps.setValue(Y_EXTENTS, '');

    expect(setScale).toBeCalledWith(Y_EXTENTS, null);
  });
});
