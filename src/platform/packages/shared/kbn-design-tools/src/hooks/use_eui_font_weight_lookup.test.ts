/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useEuiFontWeightLookup } from './use_eui_font_weight_lookup';

describe('useEuiFontWeightLookup', () => {
  it('maps numeric font weights to EUI token keys', () => {
    const { result } = renderHook(() => useEuiFontWeightLookup());

    expect(result.current.get(400)).toBe('regular');
    expect(result.current.get(600)).toBe('bold');
    expect(result.current.get(999)).toBeUndefined();
  });
});
