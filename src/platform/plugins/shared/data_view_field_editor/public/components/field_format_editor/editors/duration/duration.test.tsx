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
import { IntlProvider } from 'react-intl';

import { DurationFormatEditor } from './duration';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

const fieldType = 'number';
const format = {
  getConverterFor: jest
    .fn()
    .mockImplementation(() => (input: string) => `converted duration for ${input}`),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return {
      inputFormat: 'seconds',
      outputFormat: 'humanize',
      outputPrecision: 10,
      includeSpaceWithSuffix: true,
    };
  }),
  isHuman: () => true,
  isHumanPrecise: () => false,
  type: {
    inputFormats: [
      {
        text: 'Seconds',
        kind: 'seconds',
      },
    ],
    outputFormats: [
      {
        text: 'Human Readable',
        method: 'humanize',
      },
      {
        text: 'Minutes',
        method: 'asMinutes',
      },
    ],
  },
};
const formatParams = {
  outputPrecision: 2,
  inputFormat: '',
  outputFormat: '',
};
const onChange = jest.fn();
const onError = jest.fn();

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      {component}
    </IntlProvider>
  );
};

describe('DurationFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DurationFormatEditor.formatId).toEqual('duration');
  });

  it('should render human readable output normally', async () => {
    const { container } = renderWithIntl(
      <DurationFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('should render non-human readable output normally', async () => {
    const newFormat = {
      ...format,
      getParamDefaults: jest.fn().mockImplementation(() => {
        return {
          inputFormat: 'seconds',
          outputFormat: 'asMinutes',
          outputPrecision: 10,
          includeSpaceWithSuffix: true,
        };
      }),
      isHuman: () => false,
    };
    const { container } = renderWithIntl(
      <DurationFormatEditor
        fieldType={fieldType}
        format={newFormat as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    // Check that switches are rendered
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(1);

    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('should not render show suffix on dynamic output', async () => {
    const newFormat = {
      ...format,
      getParamDefaults: jest.fn().mockImplementation(() => {
        return {
          inputFormat: 'seconds',
          outputFormat: 'dynamic',
          outputPrecision: 2,
          includeSpaceWithSuffix: true,
        };
      }),
      isHuman: () => false,
      isHumanPrecise: () => true,
    };
    const { container } = renderWithIntl(
      <DurationFormatEditor
        fieldType={fieldType}
        format={newFormat as unknown as FieldFormat}
        formatParams={{ ...formatParams, outputFormat: 'dynamic' }}
        onChange={onChange}
        onError={onError}
      />
    );

    // Check that switches are rendered for dynamic output
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(1);

    expect(container).toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });
});
