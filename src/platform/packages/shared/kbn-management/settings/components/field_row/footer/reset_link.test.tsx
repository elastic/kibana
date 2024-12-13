/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { wrap } from '../mocks';
import { InputResetLink, InputResetLinkProps } from './reset_link';

describe('InputResetLink', () => {
  const defaultProps: InputResetLinkProps = {
    field: {
      type: 'string',
      id: 'test',
      isOverridden: false,
      ariaAttributes: {
        ariaLabel: 'Test',
      },
      defaultValue: 'default',
    },
    onReset: jest.fn(),
  };

  it('renders nothing if the field is already at its default value', () => {
    const { container } = render(wrap(<InputResetLink {...defaultProps} />));
    expect(container.firstChild).toBeNull();
  });

  it('renders a link to reset the field if there is a different saved value', () => {
    const { getByText } = render(
      wrap(
        <InputResetLink {...defaultProps} field={{ ...defaultProps.field, savedValue: 'saved' }} />
      )
    );
    const link = getByText('Reset to default');
    expect(link).toBeInTheDocument();
  });

  it('renders a link to reset the field if there is a different unsaved value', () => {
    const { getByText } = render(
      wrap(
        <InputResetLink
          {...defaultProps}
          unsavedChange={{ type: 'string', unsavedValue: 'unsaved' }}
        />
      )
    );
    const link = getByText('Reset to default');
    expect(link).toBeInTheDocument();
  });

  it('renders nothing if there is a different saved value but the same unsaved value', () => {
    const { container } = render(
      wrap(
        <InputResetLink
          {...defaultProps}
          field={{ ...defaultProps.field, savedValue: 'saved' }}
          unsavedChange={{ type: 'string', unsavedValue: 'default' }}
        />
      )
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls the onReset prop when the link is clicked', () => {
    const { getByText } = render(
      wrap(
        <InputResetLink {...defaultProps} field={{ ...defaultProps.field, savedValue: 'saved' }} />
      )
    );
    const link = getByText('Reset to default');
    fireEvent.click(link);
    expect(defaultProps.onReset).toHaveBeenCalled();
  });
});
