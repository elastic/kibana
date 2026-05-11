/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useIndicateRelatedPanelsSelector } from './use_indicate_related_panels_selector';

const createMockParentApi = ({
  indicateRelatedPanelsId,
}: {
  indicateRelatedPanelsId?: string;
} = {}) => {
  const mock = {
    indicateRelatedPanelsId$: new BehaviorSubject<string | undefined>(indicateRelatedPanelsId),
    setIndicateRelatedPanelsId: jest.fn((id?: string) => {
      mock.indicateRelatedPanelsId$.next(id);
    }),
  };
  return mock;
};

let mockParentApi = createMockParentApi();

const createMockApi = ({
  publishesRelatedPanels = true,
  uuid = 'test-panel',
  parentApi = mockParentApi,
}: {
  publishesRelatedPanels?: boolean;
  uuid?: string;
  parentApi?: object;
} = {}) => ({
  uuid,
  parentApi,
  ...(publishesRelatedPanels ? { relatedPanels$: new BehaviorSubject<string[]>(['panel-a']) } : {}),
});

describe('useIndicateRelatedPanelsSelector', () => {
  beforeEach(() => {
    mockParentApi = createMockParentApi();
    jest.restoreAllMocks();
  });

  describe('when api does not publish related panels', () => {
    it('should not subscribe to parent indicateRelatedPanelsId$', () => {
      const subscribeSpy = jest.spyOn(mockParentApi.indicateRelatedPanelsId$, 'subscribe');
      const api = createMockApi({ publishesRelatedPanels: false });

      renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      expect(subscribeSpy).not.toHaveBeenCalled();
    });
  });

  describe('when parent API cannot indicate related panels', () => {
    it('should skip subscription and set toggle to a no-op', () => {
      const api = {
        uuid: 'test-panel',
        parentApi: {},
        relatedPanels$: new BehaviorSubject<string[]>([]),
      };

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      expect(result.current.isIndicatingRelatedPanels).toBe(false);
      act(() => result.current.onToggleIndicateRelatedPanels());
      expect(result.current.isIndicatingRelatedPanels).toBe(false);
    });
  });

  describe('when parent can indicate and API publishes related panels', () => {
    it('should track indicateRelatedPanelsId from parent', async () => {
      const parentApi = createMockParentApi({ indicateRelatedPanelsId: undefined });
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      expect(result.current.isIndicatingRelatedPanels).toBe(false);

      act(() => {
        parentApi.indicateRelatedPanelsId$.next('test-panel');
      });

      await waitFor(() => {
        expect(result.current.isIndicatingRelatedPanels).toBe(true);
      });
    });

    it('should toggle indicating on', async () => {
      const parentApi = createMockParentApi();
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      await waitFor(() => expect(result.current.isIndicatingRelatedPanels).toBe(false));

      act(() => result.current.onToggleIndicateRelatedPanels());
      expect(parentApi.setIndicateRelatedPanelsId).toHaveBeenCalledWith('test-panel');
    });

    it('should toggle indicating off when already indicating', async () => {
      const parentApi = createMockParentApi({
        indicateRelatedPanelsId: 'test-panel',
      });
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      await waitFor(() => expect(result.current.isIndicatingRelatedPanels).toBe(true));

      act(() => result.current.onToggleIndicateRelatedPanels());
      expect(parentApi.setIndicateRelatedPanelsId).toHaveBeenCalledWith(undefined);
    });
  });
});
