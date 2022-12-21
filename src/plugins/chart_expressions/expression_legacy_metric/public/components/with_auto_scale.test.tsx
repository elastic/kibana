/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { computeScale, withAutoScale } from './with_auto_scale';
import { mount } from 'enzyme';

const mockElement = (clientWidth = 100, clientHeight = 200) => ({
  clientHeight,
  clientWidth,
});

describe('AutoScale', () => {
  describe('computeScale', () => {
    it('is 1 if any element is null', () => {
      expect(computeScale(null, null)).toBe(1);
      expect(computeScale(mockElement(), null)).toBe(1);
      expect(computeScale(null, mockElement())).toBe(1);
    });

    it('is never over 1', () => {
      expect(computeScale(mockElement(2000, 2000), mockElement(1000, 1000))).toBe(1);
    });

    it('is never under 0.3 in default case', () => {
      expect(computeScale(mockElement(2000, 1000), mockElement(1000, 10000))).toBe(0.3);
    });

    it('is never under specified min scale if specified', () => {
      expect(computeScale(mockElement(2000, 1000), mockElement(1000, 10000), 0.1)).toBe(0.1);
    });

    it('is the lesser of the x or y scale', () => {
      expect(computeScale(mockElement(2000, 2000), mockElement(3000, 5000))).toBe(0.4);
      expect(computeScale(mockElement(2000, 3000), mockElement(4000, 3200))).toBe(0.5);
    });
  });

  describe('withAutoScale', () => {
    it('renders', () => {
      const Component = () => <h1>Hoi!</h1>;
      const WrappedComponent = withAutoScale(Component);
      expect(mount(<WrappedComponent />)).toMatchSnapshot();
    });
  });
});
