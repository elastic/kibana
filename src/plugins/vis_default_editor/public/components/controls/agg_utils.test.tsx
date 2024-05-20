/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { IAggConfig } from '@kbn/data-plugin/public';
import {
  safeMakeLabel,
  useAvailableOptions,
  useFallbackMetric,
  useValidation,
  CUSTOM_METRIC,
} from './utils';

type Callback = () => void;

let testComp: ReactWrapper;

const TestHook: FunctionComponent<{ callback: Callback }> = ({ callback }) => {
  callback();
  return null;
};

const testHook = (callback: Callback) => {
  testComp = mount(<TestHook callback={callback} />);
};

const metricAggs = [
  {
    id: '2',
    type: { name: 'count' },
    makeLabel() {
      return 'count';
    },
  },
  {
    id: '3',
    type: { name: 'avg' },
    makeLabel() {
      return 'avg';
    },
  },
] as IAggConfig[];

const incompatibleAggs = [
  {
    id: '2',
    type: { name: 'top_hits' },
    makeLabel() {
      return 'top_hits';
    },
  },
  {
    id: '3',
    type: { name: 'percentiles' },
    makeLabel() {
      return 'percentiles';
    },
  },
] as IAggConfig[];
const aggFilter = ['!top_hits', '!percentiles'];

describe('Aggregations utils', () => {
  describe('useFallbackMetric', () => {
    let setValue: jest.Mock;
    beforeEach(() => {
      setValue = jest.fn();
    });

    describe('should not call setValue', () => {
      test('if there are no metricAggs', () => {
        testHook(() => {
          useFallbackMetric(setValue, aggFilter);
        });

        expect(setValue).not.toBeCalled();
      });

      test('if there is no value', () => {
        testHook(() => {
          useFallbackMetric(setValue, aggFilter, metricAggs);
        });

        expect(setValue).not.toBeCalled();
      });

      test('if value is "custom" metric', () => {
        testHook(() => {
          useFallbackMetric(setValue, aggFilter, metricAggs, 'custom');
        });

        expect(setValue).not.toBeCalled();
      });

      test('if value is selected metric is still available', () => {
        testHook(() => {
          useFallbackMetric(setValue, aggFilter, metricAggs, '2');
        });

        expect(setValue).not.toBeCalled();
      });
    });

    describe('should set up a new value if selected metric was removed', () => {
      test('called with undefined', () => {
        testHook(() => {
          useFallbackMetric(setValue, aggFilter, metricAggs, '7');
        });

        expect(setValue).toBeCalledWith(undefined);
      });

      test('called with fallback value', () => {
        testHook(() => {
          useFallbackMetric(setValue, aggFilter, metricAggs, '7', '_key');
        });

        expect(setValue).toBeCalledWith('_key');
      });
    });
  });

  describe('useAvailableOptions', () => {
    test('should create an array with the only custom metric', () => {
      let options;

      testHook(() => {
        options = useAvailableOptions(aggFilter);
      });

      expect(options).toEqual([CUSTOM_METRIC]);
    });

    test('should include default options', () => {
      const DEFAULT_OPTIONS = [{ text: '', value: '', hidden: true }];
      let options;

      testHook(() => {
        options = useAvailableOptions(aggFilter, [], DEFAULT_OPTIONS);
      });

      expect(options).toEqual([CUSTOM_METRIC, ...DEFAULT_OPTIONS]);
    });

    test('should create an array with enabled metrics in appropriate format', () => {
      let options;

      testHook(() => {
        options = useAvailableOptions(aggFilter, metricAggs);
      });

      expect(options).toEqual([
        { text: expect.any(String), value: '2', disabled: false },
        { text: expect.any(String), value: '3', disabled: false },
        CUSTOM_METRIC,
      ]);
    });

    test('should create an array with disabled metrics in appropriate format', () => {
      let options;

      testHook(() => {
        options = useAvailableOptions(aggFilter, incompatibleAggs);
      });

      expect(options).toEqual([
        { text: expect.any(String), value: '2', disabled: true },
        { text: expect.any(String), value: '3', disabled: true },
        CUSTOM_METRIC,
      ]);
    });
  });

  describe('useValidation', () => {
    let setValidity: jest.Mock;
    beforeEach(() => {
      setValidity = jest.fn();
    });

    test('should call setValidity', () => {
      testHook(() => {
        useValidation(setValidity, false);
      });

      expect(setValidity).toBeCalledWith(false);
    });

    test('should call setValidity with true on component unmount', () => {
      testHook(() => {
        useValidation(setValidity, false);
      });

      testComp.unmount();

      expect(setValidity).lastCalledWith(true);
      expect(setValidity).toBeCalledTimes(2);
    });
  });

  describe('safeMakeLabel', () => {
    test('should make agg label', () => {
      const label = safeMakeLabel(metricAggs[0]);

      expect(label).toBe('count');
    });

    test('should not fail and return a safety string if makeLabel func is not exist', () => {
      const label = safeMakeLabel({} as IAggConfig);

      expect(label).toEqual(expect.any(String));
    });
  });
});
