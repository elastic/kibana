/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldName } from './field_name';

const timestampFieldId = '@timestamp';

const defaultProps = {
  fieldId: timestampFieldId,
};

describe('FieldName', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  test('it renders the field name', () => {
    render(<FieldName {...defaultProps} />);
    expect(screen.getByTestId(`field-${timestampFieldId}-name`)).toHaveTextContent(
      timestampFieldId
    );
  });

  test('it highlights the text specified by the `highlight` prop', () => {
    const highlight = 'stamp';
    render(<FieldName {...defaultProps} highlight={highlight} />);

    expect(screen.getByText(highlight, { selector: 'mark' })).toBeInTheDocument();
  });
});
