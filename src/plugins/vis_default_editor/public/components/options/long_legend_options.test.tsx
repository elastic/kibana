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

  it('renders the EuiFieldNumber', () => {
    component = mountWithIntl(<LongLegendOptions {...props} />);
    expect(component.find(EuiFieldNumber).length).toBe(1);
  });

  it('should call setValue when value is changes in the number input', () => {
    component = mountWithIntl(<LongLegendOptions {...props} />);
    const numberField = component.find(EuiFieldNumber);
    numberField.props().onChange!({
      target: {
        value: 3,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>);

    expect(props.setValue).toHaveBeenCalledWith('maxLegendLines', 3);
  });

  it('input number should be disabled when truncate is false', () => {
    props.truncateLegend = false;
    component = mountWithIntl(<LongLegendOptions {...props} />);
    const numberField = component.find(EuiFieldNumber);

    expect(numberField.props().disabled).toBeTruthy();
  });
});
