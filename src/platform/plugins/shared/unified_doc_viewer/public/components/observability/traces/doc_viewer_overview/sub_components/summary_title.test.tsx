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
import { SummaryTitle } from './summary_title';

const fieldHoverActionPopoverDataTestSubj = 'FieldHoverActionPopover';

jest.mock('../../components/field_with_actions/field_hover_popover_action', () => ({
  FieldHoverActionPopover: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj={fieldHoverActionPopoverDataTestSubj}>{children}</div>
  ),
}));

jest.mock('../../components/highlight_field', () => ({
  HighlightField: ({
    value,
    formattedValue,
    as,
  }: {
    value?: string;
    formattedValue?: string;
    as?: keyof JSX.IntrinsicElements;
  }) => {
    const Tag = as || 'span';
    return <Tag dangerouslySetInnerHTML={{ __html: formattedValue || value || '' }} />;
  },
}));

describe('SpanSummaryTitle', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('renders spanName with formattedSpanName and id with formattedId', () => {
    const { getByText, container } = render(
      <SummaryTitle
        spanName="Test Span"
        formattedName="<mark>Test Span</mark>"
        id="123"
        formattedId="<mark>123</mark>"
      />
    );

    expect(container.querySelector('strong')).toHaveTextContent('Test Span');
    expect(container.querySelector('strong')?.innerHTML).toBe('<mark>Test Span</mark>');

    expect(getByText('123')).toBeInTheDocument();
    expect(container.querySelector('span')?.innerHTML).toBe('<mark>123</mark>');
  });

  it('renders only id with formattedId when spanName is not provided', () => {
    const { getByText, container } = render(
      <SummaryTitle id="123" formattedId="<mark>123</mark>" />
    );

    expect(getByText('123')).toBeInTheDocument();
    expect(container.querySelector('h2')?.innerHTML).toBe('<mark>123</mark>');
  });

  it('renders FieldHoverActionPopover for spanName and id', () => {
    const { getByText } = render(
      <SummaryTitle
        spanName="Test Span"
        formattedName="<mark>Test Span</mark>"
        id="123"
        formattedId="<mark>123</mark>"
      />
    );

    expect(getByText('Test Span')).toBeInTheDocument();
    expect(getByText('123')).toBeInTheDocument();
  });

  it('renders FieldHoverActionPopover if showActions is undefined', () => {
    const { container } = render(<SummaryTitle id="123" formattedId="<mark>123</mark>" />);

    expect(
      container.querySelector(`[data-test-subj="${fieldHoverActionPopoverDataTestSubj}"]`)
    ).not.toBeNull();
  });

  it('renders FieldHoverActionPopover if showActions is true', () => {
    const { container } = render(
      <SummaryTitle id="123" formattedId="<mark>123</mark>" showActions={true} />
    );

    expect(
      container.querySelector(`[data-test-subj="${fieldHoverActionPopoverDataTestSubj}"]`)
    ).not.toBeNull();
  });

  it('does not render FieldHoverActionPopover if showActions is false', () => {
    const { container } = render(
      <SummaryTitle id="123" formattedId="<mark>123</mark>" showActions={false} />
    );

    expect(
      container.querySelector(`[data-test-subj="${fieldHoverActionPopoverDataTestSubj}"]`)
    ).toBeNull();
  });
});
