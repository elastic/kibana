/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { FieldDefinition } from '@kbn/management-settings-types';

import { wrap } from '../mocks';
import { FieldResetLink } from './reset_link';

describe('FieldResetLink', () => {
  const defaultProps = {
    field: {
      name: 'test',
      type: 'string',
      isDefaultValue: false,
      ariaAttributes: {},
    } as FieldDefinition<'string'>,
    onReset: jest.fn(),
  };

  it('renders without errors', () => {
    const { container } = render(wrap(<FieldResetLink {...defaultProps} />));
    expect(container).toBeInTheDocument();
  });

  it('renders nothing if the field is already at its default value', () => {
    const { container } = render(
      wrap(
        <FieldResetLink {...defaultProps} field={{ ...defaultProps.field, isDefaultValue: true }} />
      )
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a link to reset the field if it is not at its default value', () => {
    const { getByText } = render(wrap(<FieldResetLink {...defaultProps} />));
    const link = getByText('Reset to default');
    expect(link).toBeInTheDocument();
  });

  it('calls the onReset prop when the link is clicked', () => {
    const { getByText } = render(wrap(<FieldResetLink {...defaultProps} />));
    const link = getByText('Reset to default');
    fireEvent.click(link);
    expect(defaultProps.onReset).toHaveBeenCalled();
  });
});
