/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TimeIntervalParamEditor } from './time_interval';
import { aggParamCommonPropsMock } from './test_utils';
import { AggParamEditorProps } from '../agg_param_props';

jest.mock('@kbn/data-plugin/public', () => ({
  search: {
    aggs: {
      isValidInterval: jest.fn().mockReturnValue(true),
      parseEsInterval: jest.fn(),
      InvalidEsCalendarIntervalError: class {},
    },
  },
}));

import { search } from '@kbn/data-plugin/public';

describe('TimeIntervalParamEditor', () => {
  let props: AggParamEditorProps<string>;

  beforeEach(() => {
    props = {
      ...aggParamCommonPropsMock,
      showValidation: true,
      setTouched: jest.fn(),
      setValidity: jest.fn(),
      setValue: jest.fn(),
    };
    props.aggParam.options = [
      {
        display: 'Auto',
        enabled: jest.fn().mockReturnValue(true),
        val: 'auto',
      },
      {
        display: 'Millisecond',
        val: 'ms',
      },
      {
        display: 'Second',
        val: 's',
      },
    ];
  });

  test('should match snapshot', () => {
    const comp = shallow(<TimeIntervalParamEditor {...props} />);
    expect(comp).toMatchSnapshot();
  });

  describe('interval "auto" value', () => {
    test('should convert interval options into combobox options', () => {
      props.value = 'auto';
      const comp = shallow(<TimeIntervalParamEditor {...props} />);

      expect(comp.children().prop('selectedOptions')).toEqual([
        {
          key: 'auto',
          label: 'Auto',
        },
      ]);
      expect(comp.children().prop('options')).toEqual([
        {
          key: 'auto',
          label: 'Auto',
        },
        {
          key: 'ms',
          label: 'Millisecond',
        },
        {
          key: 's',
          label: 'Second',
        },
      ]);
      expect(comp.prop('isInvalid')).toBeFalsy();
    });

    test('should filter out "auto" interval value if it is disabled in options and mark as invalid', () => {
      props.aggParam.options[0].enabled = jest.fn().mockReturnValue(false);
      props.value = 'auto';
      const comp = shallow(<TimeIntervalParamEditor {...props} />);

      expect(props.aggParam.options[0].enabled).toHaveBeenCalledWith(props.agg);
      expect(comp.prop('isInvalid')).toBeTruthy();
      expect(comp.children().prop('selectedOptions')).toEqual([]);
      expect(comp.children().prop('options')).toEqual([
        {
          key: 'ms',
          label: 'Millisecond',
        },
        {
          key: 's',
          label: 'Second',
        },
      ]);
    });
  });

  describe('custom interval value', () => {
    test('should have valid "2h" interval selected', () => {
      props.value = '2h';
      // @ts-ignore
      props.agg.buckets = {
        getInterval: jest.fn().mockReturnValue({
          expression: '2h',
        }),
      };

      const comp = shallow(<TimeIntervalParamEditor {...props} />);

      expect(comp.prop('isInvalid')).toBeFalsy();
      expect(comp.prop('error')).toBeUndefined();
      expect(comp.children().prop('selectedOptions')).toEqual([{ label: '2h', key: 'custom' }]);
    });

    test('should have invalid calendar interval "3w"', () => {
      props.value = '3w';
      // @ts-ignore
      props.agg.buckets = {
        getInterval: jest.fn().mockReturnValue({
          expression: '3w',
        }),
      };
      // @ts-expect-error
      search.aggs.isValidInterval.mockReturnValue(false);

      const comp = shallow(<TimeIntervalParamEditor {...props} />);

      expect(comp.prop('isInvalid')).toBeTruthy();
      expect(comp.prop('error')).toBeDefined();
      expect(comp.children().prop('selectedOptions')).toEqual([{ label: '3w', key: 'custom' }]);
    });
  });
});
