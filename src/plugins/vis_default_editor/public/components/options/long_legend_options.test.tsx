/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { LongLegendOptions, LongLegendOptionsProps } from './long_legend_options';
import { EuiFieldNumber } from '@elastic/eui';

describe('LongLegendOptions', () => {
  let props: LongLegendOptionsProps;
  let component;
  beforeAll(() => {
    props = {
      truncateLegend: true,
      setValue: jest.fn(),
    };
  });

  it('renders two EuiFieldNumber inputs for maxLegendLines and legendSize', () => {
    component = mountWithIntl(<LongLegendOptions {...props} />);
    expect(component.find(EuiFieldNumber).length).toBe(2);
  });

  it('should call setValue when value is changes in the maxLegendLines input', () => {
    component = mountWithIntl(<LongLegendOptions {...props} />);
    const numberField = component.find(EuiFieldNumber);
    numberField.first().props().onChange!({
      target: {
        value: 3,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>);

    expect(props.setValue).toHaveBeenCalledWith('maxLegendLines', 3);
  });

  it('should call setValue when value is changes in the legendSize input', () => {
    component = mountWithIntl(<LongLegendOptions {...props} />);
    const numberField = component.find(EuiFieldNumber);
    numberField.at(1).props().onChange!({
      target: {
        value: 100,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>);

    expect(props.setValue).toHaveBeenCalledWith('legendSize', 100);
  });

  it('maxLegendLines number should be disabled when truncate is false', () => {
    props.truncateLegend = false;
    component = mountWithIntl(<LongLegendOptions {...props} />);
    const numberField = component.find(EuiFieldNumber).first();

    expect(numberField.props().disabled).toBeTruthy();
  });
});
