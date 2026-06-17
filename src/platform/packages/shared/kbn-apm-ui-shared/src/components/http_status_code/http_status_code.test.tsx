/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { HttpStatusCode } from '.';
import { httpStatusCodes } from './http_status_codes';
import userEvent from '@testing-library/user-event';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(),
}));

const euiColorVisGrey0 = '111';
const euiColorVisSuccess0 = '222';
const euiColorVisWarning1 = '333';
const euiColorVisDanger0 = '444';

const apmUiSharedHttpStatusCodeBadgeTestId = 'apmUiSharedHttpStatusCodeBadge';

const expectTextInBadge = (text: string) =>
  expect(screen.queryByTestId('apmUiSharedHttpStatusCodeText')?.innerHTML).toEqual(text);

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

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      `background-color: ${euiColorVisGrey0}`
    );
  });

  it('should return correct color for status codes starting with 2', () => {
    const code = 200;
    render(<HttpStatusCode code={code} />);

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      `background-color: ${euiColorVisSuccess0}`
    );
  });

  it('should return correct color for status codes starting with 3', () => {
    const code = 300;
    render(<HttpStatusCode code={code} />);

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      `background-color: ${euiColorVisGrey0}`
    );
  });

  it('should return correct color for status codes starting with 4', () => {
    const code = 400;
    render(<HttpStatusCode code={code} />);

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      `background-color: ${euiColorVisWarning1}`
    );
  });

  it('should return correct color for status codes starting with 5', () => {
    const code = 500;
    render(<HttpStatusCode code={code} />);

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      `background-color: ${euiColorVisDanger0}`
    );
  });

  it('should return correct color for status codes starting with 7', () => {
    const code = 700;
    render(<HttpStatusCode code={code} />);

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      `background-color: ${euiColorVisDanger0}`
    );
  });

  it('should return default color for unknown status codes', () => {
    const code = 999;
    render(<HttpStatusCode code={code} />);

    expect(screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId)).toHaveStyle(
      'background-color: default'
    );
  });

  it('should show tooltip if showTooltip is true', async () => {
    const user = userEvent.setup();
    const code = 500;
    render(<HttpStatusCode code={code} showTooltip={true} />);

    const httpStatusCodeElement = screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId);
    expect(httpStatusCodeElement).toBeInTheDocument();

    await user.hover(httpStatusCodeElement!);

    await waitFor(() => {
      expect(screen.queryByText('Status code')).toBeInTheDocument();
    });
  });

  it('should NOT show tooltip if showTooltip is false', async () => {
    const user = userEvent.setup();
    const code = 500;
    render(<HttpStatusCode code={code} showTooltip={false} />);

    const httpStatusCodeElement = screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId);
    expect(httpStatusCodeElement).toBeInTheDocument();

    await user.hover(httpStatusCodeElement!);

    await waitFor(() => {
      expect(screen.queryByText('Status code')).not.toBeInTheDocument();
    });
  });

  it('should NOT show tooltip if showTooltip is undefined', async () => {
    const user = userEvent.setup();
    const code = 500;
    render(<HttpStatusCode code={code} />);

    const httpStatusCodeElement = screen.queryByTestId(apmUiSharedHttpStatusCodeBadgeTestId);
    expect(httpStatusCodeElement).toBeInTheDocument();

    await user.hover(httpStatusCodeElement!);

    await waitFor(() => {
      expect(screen.queryByText('Status code')).not.toBeInTheDocument();
    });
  });
});
