/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ExperimentalColorsId } from './flag';
import { TargetsPanel } from './targets_panel';
import { VARIANTS } from './variants';

const mockExperimentalColorsId = jest.fn((): ExperimentalColorsId => 'B');

jest.mock('./flag', () => ({
  ...jest.requireActual('./flag'),
  useExperimentalColorsId: () => mockExperimentalColorsId(),
}));

const openPanel = () => {
  render(<TargetsPanel />);
  fireEvent.click(screen.getByTestId('metricExperimentalColorsButton'));
};

const setFill = (value: string) => {
  const [, fillInput] = screen.getAllByLabelText('Fill');
  fireEvent.change(fillInput, { target: { value } });
};

describe('TargetsPanel', () => {
  afterEach(() => {
    act(() => Object.values(VARIANTS).forEach(({ targets }) => targets.reset()));
    mockExperimentalColorsId.mockReturnValue('B');
  });

  it("sets the active variant's target from its slider, keeps it in storage, and resets it", () => {
    openPanel();
    setFill('30');

    expect(VARIANTS.B.targets.get().fill).toBe(30);
    expect(
      JSON.parse(localStorage.getItem('expressionMetricVis.experimentalColors.B') ?? '{}').fill
    ).toBe(30);

    fireEvent.click(screen.getByText('Reset to defaults'));

    expect(VARIANTS.B.targets.get()).toEqual(VARIANTS.B.targets.defaults);
    expect(localStorage.getItem('expressionMetricVis.experimentalColors.B')).toBeNull();
  });

  it("turns the active variant's options on and off from its switches", () => {
    openPanel();
    const trendLine = screen.getByTestId('metricExperimentalColorsTarget-showTrendLine');

    expect(trendLine).toBeChecked();
    fireEvent.click(trendLine);

    expect(VARIANTS.B.targets.get().showTrendLine).toBe(false);
    expect(trendLine).not.toBeChecked();
  });

  it("shows only variant A's targets when the flag is A", () => {
    mockExperimentalColorsId.mockReturnValue('A');
    openPanel();

    expect(screen.queryByTestId('metricExperimentalColorsTarget-trend')).not.toBeInTheDocument();
    setFill('40');

    expect(VARIANTS.A.targets.get().fill).toBe(40);
    expect(VARIANTS.B.targets.get()).toEqual(VARIANTS.B.targets.defaults);
  });

  it('shows a hint instead of sliders with the default colors', () => {
    mockExperimentalColorsId.mockReturnValue('default');
    openPanel();

    expect(screen.queryByLabelText('Fill')).not.toBeInTheDocument();
    expect(screen.getByText(/lens\.metric\.experimentalColors/)).toBeInTheDocument();
  });
});
