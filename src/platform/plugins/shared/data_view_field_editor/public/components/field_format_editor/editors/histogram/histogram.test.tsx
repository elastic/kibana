/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { createFieldFormatMock } from '../test_utils';
import { formatId } from './constants';
import { HistogramFormatEditor } from './histogram';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const fieldType = 'histogram';

const format = createFieldFormatMock({
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { id: 'number', params: {} };
  }),
  convertToReact: jest
    .fn()
    .mockImplementation((input: number | Record<string, number[]>) =>
      typeof input === 'number' ? input.toFixed(2) : JSON.stringify(input)
    ),
});

const formatParams = {
  id: 'number' as const,
  params: {},
  type: 'histogram',
};

const onChange = jest.fn();
const onError = jest.fn();

const renderHistogramFormatEditor = () =>
  renderWithI18n(
    <HistogramFormatEditor
      fieldType={fieldType}
      format={format}
      formatParams={formatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('HistogramFormatEditor', () => {
  it('should have a formatId', () => {
    expect(HistogramFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderHistogramFormatEditor();

    expect(screen.getByText('Aggregated number format')).toBeVisible();
    expect(screen.getByText('Number')).toBeVisible();
    expect(screen.getByText('Bytes')).toBeVisible();
    expect(screen.getByText('Percentage')).toBeVisible();
    expect(screen.getByText('Numeral format pattern (optional)')).toBeVisible();
    expect(screen.getByText('Documentation')).toBeVisible();
  });
});
