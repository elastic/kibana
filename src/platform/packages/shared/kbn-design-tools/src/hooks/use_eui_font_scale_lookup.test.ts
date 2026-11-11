/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useEuiFontScaleLookup } from './use_eui_font_scale_lookup';

describe('useEuiFontScaleLookup', () => {
  it('maps font scale pixel sizes to EUI scale keys', () => {
    const { result } = renderHook(() => useEuiFontScaleLookup());

    expect(result.current.get(14)).toBe('s');
    expect(result.current.get(16)).toBe('m');
    expect(result.current.get(30)).toBe('xxl');
    expect(result.current.get(999)).toBeUndefined();
  });
});
