/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useRowHeightWarmUp, ROW_HEIGHT_WARM_UP_TIMEOUT_MS } from './cascade_leaf_custom_grid_body';

describe('cascade_leaf_custom_grid_body', () => {
  describe('useRowHeightWarmUp', () => {
    const mountGrid = () => {
      const view = renderHook(() => useRowHeightWarmUp());
      return {
        ...view,
        report: (height?: number) => act(() => view.result.current.reportRowHeight(height)),
      };
    };

    beforeEach(() => {
      jest.useFakeTimers();
      // the settled height is remembered between grids, so every test starts from a grid that settled on 65
      const grid = mountGrid();
      grid.report(65);
      grid.report(65);
      grid.unmount();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('holds the rows at the last settled height while the grid reports the height it warms up with', () => {
      const { result, report } = mountGrid();

      expect(result.current.estimatedRowHeight).toBe(65);
      expect(result.current.minRowHeight).toBe(65);

      report(34);

      expect(result.current.minRowHeight).toBe(65);
    });

    it('releases the rows once the grid reports its configured height', () => {
      const { result, report } = mountGrid();

      report(34);
      report(65);

      expect(result.current.minRowHeight).toBeUndefined();
    });

    it('accepts the warm up height when nothing else is reported in time', () => {
      const { result, report } = mountGrid();

      report(34);
      act(() => jest.advanceTimersByTime(ROW_HEIGHT_WARM_UP_TIMEOUT_MS - 1));
      expect(result.current.minRowHeight).toBe(65);

      act(() => jest.advanceTimersByTime(1));
      expect(result.current.minRowHeight).toBeUndefined();

      // the next grid starts from that height, and takes it as settled straight away
      const next = mountGrid();
      expect(next.result.current.estimatedRowHeight).toBe(34);
      next.report(34);
      expect(next.result.current.minRowHeight).toBeUndefined();
    });

    it('starts the next grid from a height that changed after the grid settled', () => {
      const first = mountGrid();
      first.report(65);
      // e.g. the density was changed
      first.report(41);
      first.unmount();

      const { result } = mountGrid();

      expect(result.current.estimatedRowHeight).toBe(41);
      expect(result.current.minRowHeight).toBe(41);
    });

    it('does not hold the rows of the next grid when rows size themselves to their content', () => {
      const first = mountGrid();
      first.report(undefined);
      expect(first.result.current.minRowHeight).toBeUndefined();
      first.unmount();

      const { result } = mountGrid();

      expect(result.current.estimatedRowHeight).toBeUndefined();
      expect(result.current.minRowHeight).toBeUndefined();
    });

    it('does not settle a grid that unmounted while it was warming up', () => {
      const first = mountGrid();
      first.report(34);
      first.unmount();
      act(() => jest.advanceTimersByTime(ROW_HEIGHT_WARM_UP_TIMEOUT_MS));

      expect(mountGrid().result.current.estimatedRowHeight).toBe(65);
    });
  });
});
