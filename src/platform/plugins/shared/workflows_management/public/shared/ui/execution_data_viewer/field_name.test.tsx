/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { FieldName } from './field_name';

describe('FieldName', () => {
  it('renders the field name text', () => {
    render(<FieldName fieldName="my_field" fieldType="string" />);
    expect(screen.getByText('my_field')).toBeInTheDocument();
  });

  it('renders FieldIcon with the given field type', () => {
    const { container } = render(<FieldName fieldName="count" fieldType="number" />);
    // FieldIcon renders an EuiToken with a title matching the type
    const fieldIcon = container.querySelector('[title="number"]');
    expect(fieldIcon).toBeInTheDocument();
  });

  it('renders with highlight text when highlight prop is provided', () => {
    const { container } = render(
      <FieldName fieldName="my_field" fieldType="string" highlight="my" />
    );
    // EuiHighlight wraps matching text in a <mark> element
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe('my');
  });

  it('renders without highlighting when highlight prop is empty', () => {
    const { container } = render(
      <FieldName fieldName="my_field" fieldType="string" highlight="" />
    );
    expect(screen.getByText('my_field')).toBeInTheDocument();
    expect(container.querySelector('mark')).not.toBeInTheDocument();
  });

  it('renders without highlighting when highlight prop is omitted', () => {
    const { container } = render(<FieldName fieldName="my_field" fieldType="string" />);
    expect(screen.getByText('my_field')).toBeInTheDocument();
    expect(container.querySelector('mark')).not.toBeInTheDocument();
  });

  it('has displayName set to FieldName', () => {
    expect(FieldName.displayName).toBe('FieldName');
  });
});
