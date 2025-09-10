/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useLensExtraActions } from './use_lens_extra_actions';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

describe('useLensExtraActions', () => {
  it('should return an empty array when no config is provided', () => {
    const { result } = renderHook(() => useLensExtraActions({}));
    expect(result.current).toEqual([]);
  });

  describe('copyToDashboard', () => {
    it('should return copyToDashboard action when config is provided', () => {
      const onClick = jest.fn();
      const { result } = renderHook(() => useLensExtraActions({ copyToDashboard: { onClick } }));

      expect(result.current).toHaveLength(1);
      const action = result.current[0];

      expect(action).toEqual(
        expect.objectContaining({
          id: 'copyToDashboard',
          order: 1,
          type: 'actionButton',
        })
      );

      expect(action.getIconType({} as ActionExecutionContext)).toBe('dashboardApp');
    });

    it('should call onClick when execute is invoked', async () => {
      const onClick = jest.fn();
      const { result } = renderHook(() => useLensExtraActions({ copyToDashboard: { onClick } }));

      const action = result.current[0];

      await act(async () => {
        await action.execute({} as ActionExecutionContext);
      });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
