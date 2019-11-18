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

import { ExtendedBoundsParamEditor, Bounds } from './extended_bounds';
import { AggParamEditorProps } from '..';

describe('ExtendedBoundsParamEditor', () => {
  let defaultProps: Partial<AggParamEditorProps<Bounds>>;

  beforeEach(() => {
    defaultProps = {
      setValue: jest.fn(),
      setValidity: jest.fn(),
    };
  });

  test('should be rendered with default set of props', () => {
    const comp = shallow(
      <ExtendedBoundsParamEditor {...(defaultProps as AggParamEditorProps<Bounds>)} />
    );

    expect(comp).toMatchSnapshot();
  });

  describe('validation', () => {
    test('should not show validation if "showValidation" param is falsy', () => {
      const comp = mount(
        <ExtendedBoundsParamEditor
          {...(defaultProps as AggParamEditorProps<Bounds>)}
          showValidation={false}
        />
      );

      expect(comp.children().props().isInvalid).toBeFalsy();
      expect(defaultProps.setValidity).toBeCalledWith(false);
    });

    test('should change its validity due to passed props and show error if it is invalid', () => {
      const comp = mount(
        <ExtendedBoundsParamEditor
          {...(defaultProps as AggParamEditorProps<Bounds>)}
          showValidation={true}
        />
      );

      expect(comp.children().props().error).toEqual(expect.any(String));
      expect(comp.children().props().isInvalid).toBeTruthy();
      expect(defaultProps.setValidity).toBeCalledWith(false);

      // set valid bounds
      comp.setProps({ value: { min: 0, max: 10 } });

      expect(comp.props().error).toBeUndefined();
      expect(comp.children().props().isInvalid).toBeFalsy();
      expect(defaultProps.setValidity).toBeCalledWith(true);

      // set invalid bounds - min > max
      comp.setProps({ value: { min: 10, max: 2 } });

      expect(comp.children().props().error).toEqual(expect.any(String));
      expect(comp.children().props().isInvalid).toBeTruthy();
      expect(defaultProps.setValidity).toBeCalledWith(false);
    });

    test('should set valid state after removing from the DOM tree', () => {
      const comp = mount(
        <ExtendedBoundsParamEditor
          {...(defaultProps as AggParamEditorProps<Bounds>)}
          showValidation={true}
        />
      );

      expect(defaultProps.setValidity).toBeCalledWith(false);

      comp.unmount();

      expect(defaultProps.setValidity).lastCalledWith(true);
      expect(defaultProps.setValidity).toBeCalledTimes(2);
    });
  });

  describe('handle changes', () => {
    test('should set numeric "min" or an empty string on change event', () => {
      const comp = mount(
        <ExtendedBoundsParamEditor
          {...(defaultProps as AggParamEditorProps<Bounds>)}
          showValidation={true}
        />
      );

      const minBound = comp.find('input').first();
      minBound.simulate('change', { target: { value: '2' } });

      expect(defaultProps.setValue).lastCalledWith({ min: 2 });

      minBound.simulate('change', { target: { value: '' } });

      expect(defaultProps.setValue).lastCalledWith({ min: '' });
    });

    test('should set numeric "max" or an empty string on change event', () => {
      const comp = mount(
        <ExtendedBoundsParamEditor
          {...(defaultProps as AggParamEditorProps<Bounds>)}
          value={{ min: 10, max: '' }}
          showValidation={true}
        />
      );

      const maxBound = comp.find('input').last();
      maxBound.simulate('change', { target: { value: '30' } });

      expect(defaultProps.setValue).toBeCalledWith({ min: 10, max: 30 });

      maxBound.simulate('change', { target: { value: '' } });

      expect(defaultProps.setValue).lastCalledWith({ min: 10, max: '' });
    });
  });
});
