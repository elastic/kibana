/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { useTooltip } from './use_tooltip';

describe('useTooltip', () => {
  it('exposes a ref and hides the tooltip on mouse out', () => {
    const { result } = renderHook(() => useTooltip<{ hideToolTip: () => void }>());

    expect(result.current.tooltipRef.current).toBeNull();

    const hideToolTip = jest.fn();

    result.current.tooltipRef.current = { hideToolTip };

    result.current.handleMouseOut();

    expect(hideToolTip).toHaveBeenCalledTimes(1);
  });
});
