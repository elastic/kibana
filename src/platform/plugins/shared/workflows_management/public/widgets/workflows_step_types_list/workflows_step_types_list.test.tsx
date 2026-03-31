/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { calculateVisibleIconsCount, WorkflowsStepTypesList } from './workflows_step_types_list';

jest.mock('@kbn/workflows', () => ({
  collectAllSteps: (steps: Array<{ type: string }>) => steps,
  getBuiltInStepDefinition: jest.fn(() => undefined),
}));

jest.mock('../../shared/ui/step_icons/get_step_icon_type', () => ({
  getStepIconType: jest.fn(() => 'globe'),
}));

describe('calculateVisibleIconsCount', () => {
  it('returns 0 for zero icons', () => {
    expect(calculateVisibleIconsCount(200, 0)).toBe(0);
  });

  it('returns 1 when container width is zero or negative', () => {
    expect(calculateVisibleIconsCount(0, 5)).toBe(1);
    expect(calculateVisibleIconsCount(-100, 3)).toBe(1);
  });

  it('returns all icons when they fit without overflow badge', () => {
    // 3 icons: 3 * (16 + 8) - 8 = 64px needed
    expect(calculateVisibleIconsCount(64, 3)).toBe(3);
    expect(calculateVisibleIconsCount(100, 3)).toBe(3);
  });

  it('shows fewer icons with overflow badge when not all fit', () => {
    // 3 icons need 64px. With only 50px, need badge (36px + 8px gap = 44px reserved)
    // Available for icons: 50 - 44 = 6px, floor(6/24) = 0, min is 1
    expect(calculateVisibleIconsCount(50, 3)).toBe(1);
  });

  it('caps at MAX_VISIBLE_ICONS (6) even with enough space', () => {
    // 10 icons, huge container — still capped at 6 visible + overflow badge
    const result = calculateVisibleIconsCount(1000, 10);
    expect(result).toBeLessThanOrEqual(6);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('always reserves space for overflow badge when total exceeds MAX_VISIBLE_ICONS', () => {
    // 8 icons, container = 200px
    // capped = 6, needsBadge = true
    // available = 200 - 36 - 8 = 156, floor(156/24) = 6, min(6, 6) = 6
    expect(calculateVisibleIconsCount(200, 8)).toBe(6);
  });

  it('returns at least 1 icon even when space is extremely tight', () => {
    expect(calculateVisibleIconsCount(10, 5)).toBe(1);
    expect(calculateVisibleIconsCount(1, 1)).toBe(1);
  });

  it('returns exact icon count for single icon', () => {
    expect(calculateVisibleIconsCount(16, 1)).toBe(1);
    expect(calculateVisibleIconsCount(200, 1)).toBe(1);
  });

  it('handles exactly MAX_VISIBLE_ICONS without needing overflow', () => {
    // 6 icons: 6 * 24 - 8 = 136px needed, no badge
    expect(calculateVisibleIconsCount(136, 6)).toBe(6);
    expect(calculateVisibleIconsCount(200, 6)).toBe(6);
  });

  it('handles MAX_VISIBLE_ICONS + 1 correctly', () => {
    // 7 icons: capped = 6, needsBadge = true
    // available = 200 - 36 - 8 = 156, floor(156/24) = 6
    expect(calculateVisibleIconsCount(200, 7)).toBe(6);
  });
});

describe('WorkflowsStepTypesList', () => {
  it('renders nothing when steps array is empty', () => {
    const { container } = render(<WorkflowsStepTypesList steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders step icons with title attributes for native tooltips', () => {
    const steps = [{ name: 'step1', type: 'http' }];
    render(<WorkflowsStepTypesList steps={steps} />);
    const icon = document.querySelector('[title="http"]');
    expect(icon).toBeInTheDocument();
  });

  it('deduplicates step types', () => {
    const steps = [
      { name: 'step1', type: 'http' },
      { name: 'step2', type: 'http' },
      { name: 'step3', type: 'slack' },
    ];
    render(<WorkflowsStepTypesList steps={steps} />);
    const httpIcons = document.querySelectorAll('[title="http"]');
    const slackIcons = document.querySelectorAll('[title="slack"]');
    expect(httpIcons.length).toBe(1);
    expect(slackIcons.length).toBe(1);
  });
});
