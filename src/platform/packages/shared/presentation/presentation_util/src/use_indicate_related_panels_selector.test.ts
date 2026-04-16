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
  viewMode = 'edit',
  indicateRelatedPanelsId,
  relatedPanelIds = [],
}: {
  viewMode?: string;
  indicateRelatedPanelsId?: string;
  relatedPanelIds?: string[];
} = {}) => ({
  viewMode$: new BehaviorSubject(viewMode),
  indicateRelatedPanelsId$: new BehaviorSubject<string | undefined>(indicateRelatedPanelsId),
  setIndicateRelatedPanelsId: jest.fn((id?: string) => {
    mockParentApi.indicateRelatedPanelsId$.next(id);
  }),
  getRelatedPanelIds$: jest.fn(() => new BehaviorSubject(relatedPanelIds)),
});

let mockParentApi = createMockParentApi();

const createMockApi = ({
  canBeRelatedPanelsIndicator = true,
  uuid = 'test-panel',
  parentApi = mockParentApi,
}: {
  canBeRelatedPanelsIndicator?: boolean;
  uuid?: string;
  parentApi?: ReturnType<typeof createMockParentApi>;
} = {}) => ({
  uuid,
  canBeRelatedPanelsIndicator,
  parentApi,
});

describe('useIndicateRelatedPanelsSelector', () => {
  beforeEach(() => {
    mockParentApi = createMockParentApi();
  });

  describe('when apiCanBeSelectedToIndicateRelated is false', () => {
    it('should not subscribe to parent API observables', () => {
      const parentApi = createMockParentApi({ relatedPanelIds: ['panel-a', 'panel-b'] });
      const api = createMockApi({ canBeRelatedPanelsIndicator: false, parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      expect(parentApi.getRelatedPanelIds$).not.toHaveBeenCalled();
      expect(result.current.canIndicateRelatedPanels).toBe(false);
      expect(result.current.numberOfRelatedPanels).toBeUndefined();
    });
  });

  describe('when apiCanBeSelectedToIndicateRelated is true', () => {
    it('should return the number of related panels', async () => {
      const parentApi = createMockParentApi({
        relatedPanelIds: ['panel-a', 'panel-b', 'panel-c'],
      });
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      await waitFor(() => {
        expect(result.current.numberOfRelatedPanels).toBe(3);
      });

      expect(parentApi.getRelatedPanelIds$).toHaveBeenCalledWith('test-panel');
      expect(result.current.canIndicateRelatedPanels).toBe(true);
    });

    it('should toggle indicating on', async () => {
      const parentApi = createMockParentApi({ relatedPanelIds: ['panel-a'] });
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      await waitFor(() => {
        expect(result.current.numberOfRelatedPanels).toBe(1);
      });

      act(() => result.current.onToggleIndicateRelatedPanels());
      expect(parentApi.setIndicateRelatedPanelsId).toHaveBeenCalledWith('test-panel');
    });

    it('should toggle indicating off when already indicating', async () => {
      const parentApi = createMockParentApi({
        indicateRelatedPanelsId: 'test-panel',
        relatedPanelIds: ['panel-a'],
      });
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      await waitFor(() => {
        expect(result.current.numberOfRelatedPanels).toBe(1);
      });

      act(() => result.current.onToggleIndicateRelatedPanels());
      expect(parentApi.setIndicateRelatedPanelsId).toHaveBeenCalledWith(undefined);
    });

    it('should not be indicating when in view mode', async () => {
      const parentApi = createMockParentApi({
        viewMode: 'view',
        relatedPanelIds: ['panel-a'],
      });
      const api = createMockApi({ parentApi });

      const { result } = renderHook(() => useIndicateRelatedPanelsSelector(api, true));

      await waitFor(() => {
        expect(result.current.numberOfRelatedPanels).toBe(1);
      });

      expect(result.current.canIndicateRelatedPanels).toBe(false);
    });
  });
});
