/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useValueWithSpaceWarning } from './use_value_with_space_warning';

describe('useValueWithSpaceWarning', () => {
  it('should return true when value is string and contains space', () => {
    const { result } = renderHook(() => useValueWithSpaceWarning({ value: ' space before' }));

    const { showSpaceWarningIcon, warningText } = result.current;
    expect(showSpaceWarningIcon).toBeTruthy();
    expect(warningText).toBeTruthy();
  });
  it('should return true when value is string and does not contain space', () => {
    const { result } = renderHook(() => useValueWithSpaceWarning({ value: 'no space' }));

    const { showSpaceWarningIcon, warningText } = result.current;
    expect(showSpaceWarningIcon).toBeFalsy();
    expect(warningText).toBeTruthy();
  });
  it('should return true when value is array and one of the elements contains space', () => {
    const { result } = renderHook(() =>
      useValueWithSpaceWarning({ value: [' space before', 'no space'] })
    );

    const { showSpaceWarningIcon, warningText } = result.current;
    expect(showSpaceWarningIcon).toBeTruthy();
    expect(warningText).toBeTruthy();
  });
  it('should return true when value is array and none contains space', () => {
    const { result } = renderHook(() =>
      useValueWithSpaceWarning({ value: ['no space', 'no space'] })
    );

    const { showSpaceWarningIcon, warningText } = result.current;
    expect(showSpaceWarningIcon).toBeFalsy();
    expect(warningText).toBeTruthy();
  });
  it('should return the tooltipIconText', () => {
    const { result } = renderHook(() =>
      useValueWithSpaceWarning({ value: ' space before', tooltipIconText: 'Warning Text' })
    );

    const { showSpaceWarningIcon, warningText } = result.current;
    expect(showSpaceWarningIcon).toBeTruthy();
    expect(warningText).toEqual('Warning Text');
  });
});
