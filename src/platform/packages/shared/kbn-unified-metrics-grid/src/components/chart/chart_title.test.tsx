/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartTitle } from './chart_title';
import { act } from 'react-dom/test-utils';

describe('ChartTitle', () => {
  it('should render plain text when searchTerm is empty', () => {
    const { getByText } = render(<ChartTitle searchTerm="" title="CPU Usage" truncation="end" />);
    expect(getByText('CPU Usage')).toBeInTheDocument();
  });

  it('should highlight matching searchTerm (case-insensitive)', () => {
    const { container } = render(
      <ChartTitle searchTerm="cpu" title="CPU Usage" truncation="end" />
    );
    // Should highlight "CPU"
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent?.toLowerCase()).toBe('cpu');
  });

  it('should highlight only matching searchTerm', () => {
    const { container } = render(
      <ChartTitle searchTerm="cpu.load" title="system.cpu.load_average.15m" truncation="end" />
    );
    // Should highlight only "cpu.load"
    const mark = container.querySelector('mark');

    expect(mark).toBeInTheDocument();
    expect(mark?.textContent?.toLowerCase()).toBe('cpu.load');
  });

  it('should highlight all occurrences of the searchTerm', () => {
    const { container } = render(
      <ChartTitle searchTerm="m" title="Memory Usage" truncation="end" />
    );
    // There should be two <mark> elements for "m"
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0].textContent?.toLowerCase()).toBe('m');
    expect(marks[1].textContent?.toLowerCase()).toBe('m');
  });

  it('should render text with no highlights if searchTerm does not match', () => {
    const { container, getByText } = render(
      <ChartTitle searchTerm="xyz" title="Memory" truncation="end" />
    );
    expect(container.querySelector('mark')).not.toBeInTheDocument();
    expect(getByText('Memory')).toBeInTheDocument();
  });

  it('handles empty text gracefully', () => {
    const { container } = render(<ChartTitle searchTerm="cpu" title="" truncation="end" />);
    expect(container.textContent).toBe('');
    expect(container.querySelector('mark')).not.toBeInTheDocument();
  });

  it('should render tooltip content when description is provided', async () => {
    const { getByTestId } = render(
      <ChartTitle
        searchTerm="cpu"
        title="CPU Usage"
        truncation="end"
        description={<div data-test-subj="tooltip-content">CPU usage tooltip content</div>}
      />
    );

    await act(async () => {
      await userEvent.hover(getByTestId('metricsExperienceChartTooltipAnchor'));
    });

    await waitFor(() => {
      expect(screen.queryByText('CPU usage tooltip content')).toBeInTheDocument();
    });

    await act(async () => {
      await userEvent.unhover(getByTestId('metricsExperienceChartTooltipAnchor'));
    });

    await waitFor(() => {
      expect(screen.queryByText('CPU usage tooltip content')).not.toBeInTheDocument();
    });
  });
});
