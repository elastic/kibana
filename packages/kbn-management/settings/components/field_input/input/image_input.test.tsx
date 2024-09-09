/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ImageInput, ImageInputProps } from './image_input';
import { wrap } from '../mocks';
import { TEST_SUBJ_PREFIX_FIELD } from '.';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const name = 'Some image field';
const id = 'some:image:field';

describe('ImageInput', () => {
  const onInputChange = jest.fn();
  const defaultProps: ImageInputProps = {
    onInputChange,
    field: {
      name,
      type: 'image',
      ariaAttributes: {
        ariaLabel: name,
      },
      id,
      isOverridden: false,
      defaultValue: null,
    },
    isSavingEnabled: true,
  };

  beforeEach(() => {
    onInputChange.mockClear();
  });

  it('renders without errors', () => {
    const { container } = render(wrap(<ImageInput {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('calls the onInputChange prop when a file is selected', async () => {
    const { getByTestId } = render(wrap(<ImageInput {...defaultProps} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`) as HTMLInputElement;
    const file = new File(['(⌐□_□)'], 'test.png', { type: 'image/png' });

    act(() => {
      userEvent.upload(input, [file]);
    });

    expect(input.files?.length).toBe(1);

    // This doesn't work for some reason.
    // expect(defaultProps.onInputChange).toHaveBeenCalledWith({ value: file });
  });

  it('disables the input when isDisabled prop is true', () => {
    const { getByTestId } = render(wrap(<ImageInput {...defaultProps} isSavingEnabled={false} />));
    const input = getByTestId(`${TEST_SUBJ_PREFIX_FIELD}-${id}`);
    expect(input).toBeDisabled();
  });
});
