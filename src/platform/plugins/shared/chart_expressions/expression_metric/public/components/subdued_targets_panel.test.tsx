/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { SubduedTargetsPanel } from './subdued_targets_panel';
import { resetSubduedTargets, useSubduedTargets } from '../services/subdued_targets';
import { DEFAULT_SUBDUED_TARGETS } from './metric_tile_colors';

describe('SubduedTargetsPanel', () => {
  afterEach(() => act(() => resetSubduedTargets()));

  it('sets a target from its slider, keeps it in storage, and resets it', () => {
    const { result } = renderHook(() => useSubduedTargets());
    render(<SubduedTargetsPanel />);

    fireEvent.click(screen.getByTestId('metricSubduedTargetsButton'));
    const [, fillInput] = screen.getAllByLabelText('Fill');
    fireEvent.change(fillInput, { target: { value: '30' } });

    expect(result.current.fill).toBe(30);
    expect(
      JSON.parse(localStorage.getItem('expressionMetricVis.subduedTargets') ?? '{}').fill
    ).toBe(30);

    fireEvent.click(screen.getByText('Reset to defaults'));

    expect(result.current).toEqual(DEFAULT_SUBDUED_TARGETS);
    expect(localStorage.getItem('expressionMetricVis.subduedTargets')).toBeNull();
  });
});
