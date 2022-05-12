/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { PercentageModeOption, PercentageModeOptionProps } from './percentage_mode';
import { EuiFieldText } from '@elastic/eui';

describe('PercentageModeOption', () => {
  let props: PercentageModeOptionProps;
  let component;
  beforeAll(() => {
    props = {
      percentageMode: true,
      setValue: jest.fn(),
    };
  });

  it('renders the EuiFieldText', () => {
    component = mountWithIntl(<PercentageModeOption {...props} />);
    expect(component.find(EuiFieldText).length).toBe(1);
  });

  it('should call setValue when value was putted in fieldText', () => {
    component = mountWithIntl(<PercentageModeOption {...props} />);
    const fieldText = component.find(EuiFieldText);
    fieldText.props().onChange!({
      target: {
        value: '0.0%',
      },
    } as React.ChangeEvent<HTMLInputElement>);

    expect(props.setValue).toHaveBeenCalledWith('percentageFormatPattern', '0.0%');
  });

  it('fieldText should be disabled when percentageMode is false', () => {
    props.percentageMode = false;
    component = mountWithIntl(<PercentageModeOption {...props} />);
    const fieldText = component.find(EuiFieldText);

    expect(fieldText.props().disabled).toBeTruthy();
  });
});
