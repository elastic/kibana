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
import { useEuiTheme } from '@elastic/eui';
import { HttpStatusCode } from '.';
import { httpStatusCodes } from './http_status_codes';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(),
}));

const euiColorVisGrey0 = '111';
const euiColorVisSuccess0 = '222';
const euiColorVisWarning1 = '333';
const euiColorVisDanger0 = '444';

const expectTextInBadge = (text: string) =>
  expect(
    screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeText')?.innerHTML
  ).toEqual(text);

describe('HttpStatusCode', () => {
  beforeEach(() => {
    (useEuiTheme as jest.Mock).mockReturnValue({
      euiTheme: {
        colors: {
          vis: {
            euiColorVisGrey0,
            euiColorVisSuccess0,
            euiColorVisWarning1,
            euiColorVisDanger0,
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the status code and its description correctly', () => {
    const code = 200;
    render(<HttpStatusCode code={code} />);

    expectTextInBadge(`${code} ${httpStatusCodes[code.toString()]}`);
  });

  it('should return correct color for status codes starting with 1', () => {
    const code = 100;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle(`background-color: ${euiColorVisGrey0}`);
  });

  it('should return correct color for status codes starting with 2', () => {
    const code = 200;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle(`background-color: ${euiColorVisSuccess0}`);
  });

  it('should return correct color for status codes starting with 3', () => {
    const code = 300;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle(`background-color: ${euiColorVisGrey0}`);
  });

  it('should return correct color for status codes starting with 4', () => {
    const code = 400;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle(`background-color: ${euiColorVisWarning1}`);
  });

  it('should return correct color for status codes starting with 5', () => {
    const code = 500;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle(`background-color: ${euiColorVisDanger0}`);
  });

  it('should return correct color for status codes starting with 7', () => {
    const code = 700;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle(`background-color: ${euiColorVisDanger0}`);
  });

  it('should return default color for unknown status codes', () => {
    const code = 999;
    render(<HttpStatusCode code={code} />);

    expect(
      screen.queryByTestId('unifiedDocViewerObservabilityTracesHttpStatusCodeBadge')
    ).toHaveStyle('background-color: default');
  });
});
