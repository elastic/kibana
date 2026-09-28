/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { EMPTY_LABEL } from '@kbn/field-formats-common';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldTopValuesBucket, { type FieldTopValuesBucketProps } from './field_top_values_bucket';

const filterableField = new DataViewField({
  name: 'extension',
  type: 'string',
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  scripted: false,
});

const nonFilterableField = new DataViewField({
  name: 'message',
  type: 'string',
  searchable: false,
  aggregatable: false,
  readFromDocValues: false,
  scripted: false,
});

const defaultProps: FieldTopValuesBucketProps = {
  'data-test-subj': 'test',
  field: filterableField,
  fieldValue: 'sourceA',
  formattedFieldValue: 'sourceA',
  formattedPercentage: '10.0%',
  progressValue: 0.1,
  count: 500,
  color: '#000',
};

const renderBucket = (props: Partial<FieldTopValuesBucketProps> = {}) => {
  return renderWithKibanaRenderContext(<FieldTopValuesBucket {...defaultProps} {...props} />);
};

describe('UnifiedFieldList <FieldTopValuesBucket />', () => {
  it('renders progress bar with correct percentage', () => {
    renderBucket();

    expect(screen.getByRole('progressbar', { name: 'sourceA' })).toHaveAttribute(
      'aria-valuetext',
      '10.0%'
    );
  });

  it('displays formatted field value when provided', () => {
    renderBucket({ formattedFieldValue: 'my-value' });

    const labelContainer = screen.getByTestId('test-topValues-formattedFieldValue');
    expect(within(labelContainer).getByText('my-value')).toBeInTheDocument();
  });

  it('displays EMPTY_LABEL when formattedFieldValue is empty string', () => {
    renderBucket({ formattedFieldValue: '' });

    const labelContainer = screen.getByTestId('test-topValues-formattedFieldValue');
    expect(within(labelContainer).getByText(EMPTY_LABEL)).toBeInTheDocument();
  });

  it('displays "Other" when type is "other"', () => {
    renderBucket({ formattedFieldValue: undefined, type: 'other' });

    const labelContainer = screen.getByTestId('test-topValues-formattedFieldValue');
    expect(within(labelContainer).getByText('Other')).toBeInTheDocument();
  });

  it('displays "-" when formattedFieldValue is undefined', () => {
    renderBucket({ formattedFieldValue: undefined });

    const labelContainer = screen.getByTestId('test-topValues-formattedFieldValue');
    expect(within(labelContainer).getByText('-')).toBeInTheDocument();
  });

  it('does not render filter buttons when onAddFilter is undefined', () => {
    renderBucket({ onAddFilter: undefined });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('does not render filter buttons when field.filterable is false', () => {
    renderBucket({ field: nonFilterableField, onAddFilter: jest.fn() });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders filter buttons when onAddFilter provided and field.filterable is true', () => {
    renderBucket({ onAddFilter: jest.fn() });

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('renders 48px placeholder instead of buttons when type is "other"', () => {
    renderBucket({ type: 'other', onAddFilter: jest.fn() });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByTestId('test-filterActions-placeholder')).toBeInTheDocument();
  });

  it('calls onAddFilter with "+" when plus button is clicked', async () => {
    const mockAddFilter = jest.fn();

    renderBucket({ onAddFilter: mockAddFilter });

    await userEvent.click(screen.getByRole('button', { name: 'Filter for extension: "sourceA"' }));

    expect(mockAddFilter).toHaveBeenCalledWith(filterableField, 'sourceA', '+');
  });

  it('calls onAddFilter with "-" when minus button is clicked', async () => {
    const mockAddFilter = jest.fn();

    renderBucket({ onAddFilter: mockAddFilter });

    await userEvent.click(screen.getByRole('button', { name: 'Filter out extension: "sourceA"' }));

    expect(mockAddFilter).toHaveBeenCalledWith(filterableField, 'sourceA', '-');
  });

  it('uses field.subType.multi.parent for label when available', () => {
    const multiField = new DataViewField({
      name: 'extension.keyword',
      type: 'string',
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      scripted: false,
      subType: { multi: { parent: 'extension' } },
    });

    renderBucket({ field: multiField, onAddFilter: jest.fn() });

    expect(
      screen.getByRole('button', { name: 'Filter for extension: "sourceA"' })
    ).toBeInTheDocument();
  });

  it('falls back to field.name when not a multi-field', () => {
    renderBucket({ onAddFilter: jest.fn() });

    expect(
      screen.getByRole('button', { name: 'Filter for extension: "sourceA"' })
    ).toBeInTheDocument();
  });

  it('calls overrideFieldTopValueBar and applies returned overrides', () => {
    const overrideFieldTopValueBar = jest.fn(() => ({
      formattedPercentage: '99.0%',
    }));

    renderBucket({ overrideFieldTopValueBar });

    expect(overrideFieldTopValueBar).toHaveBeenCalled();
    expect(screen.getByRole('progressbar', { name: 'sourceA' })).toHaveAttribute(
      'aria-valuetext',
      '99.0%'
    );
  });
});
