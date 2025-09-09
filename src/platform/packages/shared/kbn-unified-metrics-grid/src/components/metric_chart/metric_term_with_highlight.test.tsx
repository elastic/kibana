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
import { MetricTermWithHighlight } from './metric_term_with_highlight';

describe('MetricTermWithHighlight', () => {
  it('should render plain text when searchTerm is empty', () => {
    const { getByText } = render(
      <MetricTermWithHighlight searchTerm="" text="CPU Usage" truncation="end" />
    );
    expect(getByText('CPU Usage')).toBeInTheDocument();
  });

  it('should highlight matching searchTerm (case-insensitive)', () => {
    const { container } = render(
      <MetricTermWithHighlight searchTerm="cpu" text="CPU Usage" truncation="end" />
    );
    // Should highlight "CPU"
    const mark = container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent?.toLowerCase()).toBe('cpu');
  });

  it('should highlight only matching searchTerm', () => {
    const { container, getByTestId } = render(
      <MetricTermWithHighlight
        searchTerm="cpu.load"
        text="system.cpu.load_average.15m"
        truncation="end"
      />
    );
    // Should highlight only "cpu.load"
    const part1 = getByTestId('system.0');
    const mark = container.querySelector('mark');
    const part2 = getByTestId('_average.15m2');

    expect(part1).toBeInTheDocument();
    expect(part1?.textContent).toBe('system.');

    expect(mark).toBeInTheDocument();
    expect(mark?.textContent?.toLowerCase()).toBe('cpu.load');

    expect(part2).toBeInTheDocument();
    expect(part2?.textContent).toBe('_average.15m');
  });

  it('should highlight all occurrences of the searchTerm', () => {
    const { container } = render(
      <MetricTermWithHighlight searchTerm="m" text="Memory Usage" truncation="end" />
    );
    // There should be two <mark> elements for "m"
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0].textContent?.toLowerCase()).toBe('m');
    expect(marks[1].textContent?.toLowerCase()).toBe('m');
  });

  it('should render text with no highlights if searchTerm does not match', () => {
    const { container, getByText } = render(
      <MetricTermWithHighlight searchTerm="xyz" text="Memory" truncation="end" />
    );
    expect(container.querySelector('mark')).not.toBeInTheDocument();
    expect(getByText('Memory')).toBeInTheDocument();
  });

  it('handles empty text gracefully', () => {
    const { container } = render(
      <MetricTermWithHighlight searchTerm="cpu" text="" truncation="end" />
    );
    expect(container.textContent).toBe('');
    expect(container.querySelector('mark')).not.toBeInTheDocument();
  });
});
