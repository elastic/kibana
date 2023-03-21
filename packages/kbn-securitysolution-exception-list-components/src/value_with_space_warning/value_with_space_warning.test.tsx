/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ValueWithSpaceWarning } from '.';

import * as useValueWithSpaceWarningMock from './use_value_with_space_warning';

jest.mock('./use_value_with_space_warning');

describe('ValueWithSpaceWarning', () => {
  beforeEach(() => {
    // @ts-ignore
    useValueWithSpaceWarningMock.useValueWithSpaceWarning = jest
      .fn()
      .mockReturnValue({ showSpaceWarningIcon: true, warningText: 'Warning Text' });
  });
  it('should not render if value is falsy', () => {
    const container = render(<ValueWithSpaceWarning value="" />);
    expect(container.queryByTestId('valueWithSpaceWarningTooltip')).toBeFalsy();
  });
  it('should not render if showSpaceWarning is falsy', () => {
    // @ts-ignore
    useValueWithSpaceWarningMock.useValueWithSpaceWarning = jest
      .fn()
      .mockReturnValue({ showSpaceWarningIcon: false, warningText: '' });

    const container = render(<ValueWithSpaceWarning value="Test" />);
    expect(container.queryByTestId('valueWithSpaceWarningTooltip')).toBeFalsy();
  });
  it('should render if showSpaceWarning is truthy', () => {
    const container = render(<ValueWithSpaceWarning value="Test" />);
    expect(container.getByTestId('valueWithSpaceWarningTooltip')).toBeInTheDocument();
  });
  it('should show the tooltip when the icon is clicked', async () => {
    const container = render(<ValueWithSpaceWarning value="Test" />);

    fireEvent.mouseOver(container.getByTestId('valueWithSpaceWarningTooltip'));
    expect(await container.findByText('Warning Text')).toBeInTheDocument();
  });
});
