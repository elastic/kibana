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
import { DurationFormatEditor } from './duration';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const fieldType = 'number';

const createDurationFormat = ({
  outputFormat = 'humanize',
  outputPrecision = 10,
  isHuman = true,
  isHumanPrecise = false,
} = {}) =>
  createFieldFormatMock({
    getParamDefaults: jest.fn().mockImplementation(() => {
      return {
        includeSpaceWithSuffix: true,
        inputFormat: 'seconds',
        outputFormat,
        outputPrecision,
      };
    }),
    isHuman: () => isHuman,
    isHumanPrecise: () => isHumanPrecise,
    convertToReact: jest
      .fn()
      .mockImplementation((input: string) => `converted duration for ${input}`),
    type: {
      inputFormats: [
        {
          kind: 'seconds',
          text: 'Seconds',
        },
      ],
      outputFormats: [
        {
          method: 'humanize',
          text: 'Human Readable',
        },
        {
          method: 'asMinutes',
          text: 'Minutes',
        },
      ],
    },
  });

const format = createDurationFormat();

const formatParams = {
  inputFormat: '',
  outputFormat: '',
  outputPrecision: 2,
};

const onChange = jest.fn();
const onError = jest.fn();

const renderDurationFormatEditor = ({
  newFormat = format,
  newFormatParams = formatParams,
}: {
  newFormat?: typeof format;
  newFormatParams?: typeof formatParams;
} = {}) =>
  renderWithI18n(
    <DurationFormatEditor
      fieldType={fieldType}
      format={newFormat}
      formatParams={newFormatParams}
      onChange={onChange}
      onError={onError}
    />
  );

describe('DurationFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DurationFormatEditor.formatId).toEqual(formatId);
  });

  it('should render human readable output normally', () => {
    renderDurationFormatEditor();

    expect(screen.getByText('Input format')).toBeVisible();
    expect(screen.getByText('Output format')).toBeVisible();
    expect(screen.getByText('converted duration for -123')).toBeVisible();
    expect(screen.queryByText('Decimal places')).not.toBeInTheDocument();
    expect(screen.queryByText('Show suffix')).not.toBeInTheDocument();
  });

  it('should render non-human readable output normally', () => {
    const newFormat = createDurationFormat({
      outputFormat: 'asMinutes',
      isHuman: false,
    });

    renderDurationFormatEditor({ newFormat });

    expect(screen.getByText('Input format')).toBeVisible();
    expect(screen.getByText('Output format')).toBeVisible();
    expect(screen.getByText('Decimal places')).toBeVisible();
    expect(screen.getByText('Show suffix')).toBeVisible();
    expect(screen.getByText('Use short suffix')).toBeVisible();
    expect(screen.getByText('Include space between suffix and value')).toBeVisible();
    expect(screen.getByText('converted duration for -123')).toBeVisible();
  });

  it('should not render show suffix on dynamic output', () => {
    const newFormat = createDurationFormat({
      outputFormat: 'dynamic',
      outputPrecision: 2,
      isHuman: false,
      isHumanPrecise: true,
    });

    renderDurationFormatEditor({
      newFormat,
      newFormatParams: { ...formatParams, outputFormat: 'dynamic' },
    });

    expect(screen.getByText('Input format')).toBeVisible();
    expect(screen.getByText('Output format')).toBeVisible();
    expect(screen.getByText('Decimal places')).toBeVisible();
    expect(screen.queryByText('Show suffix')).not.toBeInTheDocument();
    expect(screen.getByText('Use short suffix')).toBeVisible();
    expect(screen.getByText('Include space between suffix and value')).toBeVisible();
    expect(screen.getByText('converted duration for -123')).toBeVisible();

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);
    expect(switches[0]).toBeEnabled();
    expect(switches[1]).toBeEnabled();
  });
});
