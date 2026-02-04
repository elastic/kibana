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
import {
  ACTION_COPY_TO_DASHBOARD,
  ACTION_VIEW_DETAILS,
  ACTION_EXPLORE_IN_DISCOVER_TAB,
} from '../../../common/constants';

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
          id: ACTION_COPY_TO_DASHBOARD,
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

  describe('viewDetails', () => {
    it('should return viewDetails action when config is provided', () => {
      const onClick = jest.fn();
      const { result } = renderHook(() => useLensExtraActions({ viewDetails: { onClick } }));

      expect(result.current).toHaveLength(1);
      const action = result.current[0];

      expect(action).toEqual(
        expect.objectContaining({
          id: ACTION_VIEW_DETAILS,
          order: 2,
          type: 'actionButton',
        })
      );

      expect(action.getIconType({} as ActionExecutionContext)).toBe('eye');
    });

    it('should call onClick when execute is invoked', async () => {
      const onClick = jest.fn();
      const { result } = renderHook(() => useLensExtraActions({ viewDetails: { onClick } }));

      const action = result.current[0];

      await act(async () => {
        await action.execute({} as ActionExecutionContext);
      });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('exploreInDiscoverTab', () => {
    it('should return exploreInDiscoverTab action when config is provided', () => {
      const onClick = jest.fn();
      const { result } = renderHook(() =>
        useLensExtraActions({ exploreInDiscoverTab: { onClick } })
      );

      expect(result.current).toHaveLength(1);
      const action = result.current[0];

      expect(action).toEqual(
        expect.objectContaining({
          id: ACTION_EXPLORE_IN_DISCOVER_TAB,
          order: 20,
          type: 'actionButton',
        })
      );

      expect(action.getIconType({} as ActionExecutionContext)).toBe('discoverApp');
    });

    it('should call onClick when execute is invoked', async () => {
      const onClick = jest.fn();
      const { result } = renderHook(() =>
        useLensExtraActions({ exploreInDiscoverTab: { onClick } })
      );

      const action = result.current[0];

      await act(async () => {
        await action.execute({} as ActionExecutionContext);
      });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should always be compatible', async () => {
      const onClick = jest.fn();
      const { result } = renderHook(() =>
        useLensExtraActions({ exploreInDiscoverTab: { onClick } })
      );

      const action = result.current[0];
      const isCompatible = await action.isCompatible({} as ActionExecutionContext);

      expect(isCompatible).toBe(true);
    });
  });

  describe('multiple actions', () => {
    it('should return all actions when all configs are provided', () => {
      const copyOnClick = jest.fn();
      const viewOnClick = jest.fn();
      const exploreOnClick = jest.fn();
      const { result } = renderHook(() =>
        useLensExtraActions({
          copyToDashboard: { onClick: copyOnClick },
          viewDetails: { onClick: viewOnClick },
          exploreInDiscoverTab: { onClick: exploreOnClick },
        })
      );

      expect(result.current).toHaveLength(3);

      const copyAction = result.current.find((action) => action.id === ACTION_COPY_TO_DASHBOARD);
      const viewAction = result.current.find((action) => action.id === ACTION_VIEW_DETAILS);
      const exploreAction = result.current.find(
        (action) => action.id === ACTION_EXPLORE_IN_DISCOVER_TAB
      );

      expect(copyAction).toBeDefined();
      expect(viewAction).toBeDefined();
      expect(exploreAction).toBeDefined();
    });
  });
});
