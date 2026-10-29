/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { NodeIconChip, NodeStepIcon } from './node_icon_chip';

describe('NodeIconChip', () => {
  it('renders a fixed 32px square tile by default', () => {
    render(
      <NodeIconChip background="red" border="blue" borderRadius={4} data-test-subj="chip">
        {'x'}
      </NodeIconChip>
    );
    const style = getComputedStyle(screen.getByTestId('chip'));
    expect(style.width).toBe('32px');
    expect(style.height).toBe('32px');
    expect(style.borderRadius).toBe('4px');
  });

  it('honours a custom size and ignores it when stretching to the row', () => {
    const { rerender } = render(
      <NodeIconChip background="red" border="blue" borderRadius={4} size={28} data-test-subj="chip">
        {'x'}
      </NodeIconChip>
    );
    expect(getComputedStyle(screen.getByTestId('chip')).width).toBe('28px');

    rerender(
      <NodeIconChip
        background="red"
        border="blue"
        borderRadius={4}
        size={28}
        fillRow
        data-test-subj="chip"
      >
        {'x'}
      </NodeIconChip>
    );
    const style = getComputedStyle(screen.getByTestId('chip'));
    expect(style.width).toBe('auto');
    expect(style.alignSelf).toBe('stretch');
  });
});

describe('NodeStepIcon', () => {
  it('delegates to renderStepIcon with the trigger flag and tint', () => {
    const renderStepIcon = jest.fn(() => <span data-test-subj="custom-icon" />);
    render(
      <NodeStepIcon
        iconType="gear"
        iconColor="#123456"
        renderStepIcon={renderStepIcon}
        stepType="manual"
        isTrigger
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(renderStepIcon).toHaveBeenCalledWith({
      stepType: 'manual',
      isTrigger: true,
      size: 'm',
      color: '#123456',
    });
  });

  it('renders the fallback when no renderStepIcon is provided', () => {
    render(
      <NodeStepIcon
        iconType="gear"
        iconColor={undefined}
        stepType="http"
        isTrigger={false}
        fallback={<span data-test-subj="fallback-icon" />}
      />
    );
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });
});
