/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ExceptionsFlyoutMeta } from '.';

describe('ExceptionsFlyoutMeta', () => {
  it('it renders component', () => {
    const wrapper = render(
      <ExceptionsFlyoutMeta exceptionItemName={'Test name'} onChange={jest.fn()} />
    );

    expect(wrapper.getByTestId('exceptionFlyoutName')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionFlyoutNameInput')).toHaveTextContent('Test name');
  });

  it('it calls onChange on name change', () => {
    const mockOnChange = jest.fn();
    const wrapper = render(<ExceptionsFlyoutMeta exceptionItemName={''} onChange={mockOnChange} />);

    fireEvent.change(wrapper.getByTestId('exceptionFlyoutNameInput'), {
      target: { value: 'Name change' },
    });

    expect(mockOnChange).toHaveBeenCalledWith(['name', 'Name change']);
  });
});
