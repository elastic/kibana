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
import { screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import moment from 'moment';
import type { Moment } from 'moment-timezone';
import type { TimelineProps } from '.';
import { TimelineAxisContainer, VerticalLinesContainer } from '.';
import type { AgentMark } from './marker/agent_marker';

function renderWithTheme(component: React.ReactNode, params?: any) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>, params);
}

function mockMoment() {
  // avoid timezone issues
  jest.spyOn(moment.prototype, 'format').mockImplementation(function (this: Moment) {
    return `1st of January (mocking ${this.unix()})`;
  });

  // convert relative time to absolute time to avoid timing issues
  jest.spyOn(moment.prototype, 'fromNow').mockImplementation(function (this: Moment) {
    return `1337 minutes ago (mocking ${this.unix()})`;
  });
}

const originalConsoleWarn = console.warn; // eslint-disable-line no-console
function disableConsoleWarning(messageToDisable: string) {
  return jest.spyOn(console, 'warn').mockImplementation((message) => {
    if (!message.startsWith(messageToDisable)) {
      originalConsoleWarn(message);
    }
  });
}

describe('Timeline Components', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    mockMoment();
    consoleMock = disableConsoleWarning('Warning: componentWill');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  const commonProps: TimelineProps = {
    xMax: 1000,
    margins: {
      top: 100,
      left: 50,
      right: 50,
      bottom: 0,
    },
    marks: [
      {
        id: 'timeToFirstByte',
        offset: 100000,
        type: 'agentMark',
        verticalLine: true,
      },
      {
        id: 'domInteractive',
        offset: 110000,
        type: 'agentMark',
        verticalLine: true,
      },
      {
        id: 'domComplete',
        offset: 190000,
        type: 'agentMark',
        verticalLine: true,
      },
    ] as AgentMark[],
  };

  it('renders TimelineAxisContainer with data', () => {
    renderWithTheme(<TimelineAxisContainer {...commonProps} />);

    const timeline = screen.getByTestId('timeline-axis-container');
    expect(timeline).toBeInTheDocument();
    expect(timeline).toMatchSnapshot();
  });

  it('renders VerticalLinesContainer with data', () => {
    renderWithTheme(<VerticalLinesContainer {...commonProps} />);

    const verticalLines = screen.getByTestId('vertical-lines');
    expect(verticalLines).toBeInTheDocument();
    expect(verticalLines).toMatchSnapshot();
  });

  it('renders TimelineAxisContainer with zero duration', () => {
    const zeroProps = {
      ...commonProps,
      xMax: 0,
      marks: undefined,
    };

    renderWithTheme(<TimelineAxisContainer {...zeroProps} />);

    const timeline = screen.getByTestId('timeline-axis-container');
    expect(timeline).toBeInTheDocument();
  });

  it('renders VerticalLinesContainer with zero duration', () => {
    const zeroProps = {
      ...commonProps,
      xMax: 0,
      marks: undefined,
    };

    renderWithTheme(<VerticalLinesContainer {...zeroProps} />);

    const verticalLines = screen.getByTestId('vertical-lines');
    expect(verticalLines).toBeInTheDocument();
  });
});
