/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInternalStateContainer } from './discover_internal_state_container';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';

const createMockDataView = (id: string) => ({ id }) as DataView;
const createMockDoc = (id: string) => ({ id }) as DataTableRecord;

describe('discover_internal_state_container', () => {
  describe('expandedDocCustomState', () => {
    it('should initialize expandedDocCustomState as undefined', () => {
      const container = getInternalStateContainer();
      expect(container.get().expandedDocCustomState).toBeUndefined();
    });

    it('should set expandedDocCustomState via transition', () => {
      const container = getInternalStateContainer();
      const customState = { waterfallItemId: 'span-1', flyoutDetailTab: 'metadata' };

      container.transitions.setExpandedDocCustomState(customState);

      expect(container.get().expandedDocCustomState).toEqual(customState);
    });

    it('should clear expandedDocCustomState when expandedDoc is set to undefined', () => {
      const container = getInternalStateContainer();

      container.transitions.setExpandedDoc(createMockDoc('doc-1'));
      container.transitions.setExpandedDocCustomState({ waterfallItemId: 'span-1' });

      expect(container.get().expandedDocCustomState).toEqual({ waterfallItemId: 'span-1' });

      container.transitions.setExpandedDoc(undefined);

      expect(container.get().expandedDocCustomState).toBeUndefined();
    });

    it('should preserve expandedDocCustomState when expandedDoc is changed to a different doc', () => {
      const container = getInternalStateContainer();

      container.transitions.setExpandedDoc(createMockDoc('doc-1'));
      container.transitions.setExpandedDocCustomState({ waterfallItemId: 'span-1' });
      container.transitions.setExpandedDoc(createMockDoc('doc-2'));

      expect(container.get().expandedDocCustomState).toEqual({ waterfallItemId: 'span-1' });
    });

    it('should clear expandedDocCustomState when data view changes', () => {
      const container = getInternalStateContainer();

      container.transitions.setDataView(createMockDataView('dv-1'));
      container.transitions.setExpandedDocCustomState({ waterfallItemId: 'span-1' });

      expect(container.get().expandedDocCustomState).toEqual({ waterfallItemId: 'span-1' });

      container.transitions.setDataView(createMockDataView('dv-2'));

      expect(container.get().expandedDocCustomState).toBeUndefined();
    });

    it('should preserve expandedDocCustomState when same data view is re-set', () => {
      const container = getInternalStateContainer();

      container.transitions.setDataView(createMockDataView('dv-1'));
      container.transitions.setExpandedDocCustomState({ waterfallItemId: 'span-1' });
      container.transitions.setDataView(createMockDataView('dv-1'));

      expect(container.get().expandedDocCustomState).toEqual({ waterfallItemId: 'span-1' });
    });

    it('should clear expandedDocCustomState on resetOnSavedSearchChange', () => {
      const container = getInternalStateContainer();

      container.transitions.setExpandedDocCustomState({ waterfallItemId: 'span-1' });
      container.transitions.resetOnSavedSearchChange();

      expect(container.get().expandedDocCustomState).toBeUndefined();
    });

    it('should allow setting expandedDocCustomState to undefined explicitly', () => {
      const container = getInternalStateContainer();

      container.transitions.setExpandedDocCustomState({ waterfallItemId: 'span-1' });
      container.transitions.setExpandedDocCustomState(undefined);

      expect(container.get().expandedDocCustomState).toBeUndefined();
    });
  });
});
