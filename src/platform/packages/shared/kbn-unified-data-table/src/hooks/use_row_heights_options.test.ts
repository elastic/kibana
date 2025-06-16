/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useRowHeightsOptions } from './use_row_heights_options';

describe('useRowHeightsOptions', () => {
  it('should convert rowHeightLines -1 to auto', () => {
    const { result } = renderHook(() => {
      return useRowHeightsOptions({
        rowHeightLines: -1,
      });
    });
    expect(result.current.defaultHeight).toEqual('auto');
  });

  it('should convert custom rowHeightLines to lineCount', () => {
    const { result } = renderHook(() => {
      return useRowHeightsOptions({
        rowHeightLines: 2,
      });
    });
    expect(result.current.defaultHeight).toEqual({ lineCount: 2 });
  });

  it('should pass through rowLineHeight', () => {
    const { result } = renderHook(() => {
      return useRowHeightsOptions({
        rowHeightLines: 2,
        rowLineHeight: '2em',
      });
    });
    expect(result.current.lineHeight).toEqual('2em');
  });
});
