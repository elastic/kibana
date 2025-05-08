/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import {
  PERFORMANCE_TRACKER_TYPES,
  PERFORMANCE_TRACKER_MARKS,
  createPerformanceTracker,
  getPerformanceTrackersByType,
  getPerformanceTrackersGroupedById,
  clearPerformanceTrackersByType,
  getMeanFromPerformanceMeasures,
  findMarkerByNamePostfix,
} from './performance_tracker';

// Mock the performance API
const mockMark = jest.fn();
const mockGetEntriesByType = jest.fn();
const mockClearMarks = jest.fn();
const mockMeasure = jest.fn();

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('Performance Tracker', () => {
  beforeAll(() => {
    // Setup performance API mocks
    Object.defineProperty(window, 'performance', {
      value: {
        mark: mockMark,
        getEntriesByType: mockGetEntriesByType,
        clearMarks: mockClearMarks,
        measure: mockMeasure,
      },
      writable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPerformanceTracker', () => {
    it('creates a tracker with the correct mark method', () => {
      const tracker = createPerformanceTracker({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        subType: 'testSubType',
      });

      expect(tracker).toHaveProperty('mark');
      expect(typeof tracker.mark).toBe('function');
      expect(uuidv4).toHaveBeenCalledTimes(1);
    });

    it('generates mark names with the correct format', () => {
      const tracker = createPerformanceTracker({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        subType: 'testSubType',
      });

      tracker.mark(PERFORMANCE_TRACKER_MARKS.PRE_RENDER);

      expect(mockMark).toHaveBeenCalledWith('Panel:testSubType:preRender', {
        detail: { id: 'test-uuid' },
      });
    });
  });

  describe('getPerformanceTrackersByType', () => {
    it('filters marks by type prefix', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Panel:test2:renderStart', startTime: 200, detail: { id: 'id2' } },
        { name: 'Other:test:preRender', startTime: 300, detail: { id: 'id3' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      const result = getPerformanceTrackersByType('Panel');

      expect(mockGetEntriesByType).toHaveBeenCalledWith('mark');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Panel:test1:preRender');
      expect(result[1].name).toBe('Panel:test2:renderStart');
    });

    it('returns an empty array when no marks match', () => {
      mockGetEntriesByType.mockReturnValue([
        { name: 'Other:test:preRender', startTime: 300, detail: { id: 'id3' } },
      ]);

      const result = getPerformanceTrackersByType('Panel');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPerformanceTrackersGroupedById', () => {
    it('groups performance marks by id', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Panel:test1:renderStart', startTime: 200, detail: { id: 'id1' } },
        { name: 'Panel:test2:preRender', startTime: 300, detail: { id: 'id2' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      const result = getPerformanceTrackersGroupedById('Panel');

      // Check the structure of the result - should be grouped by id
      expect(Object.keys(result).length).toBe(2);
      expect(result.id1).toBeDefined();
      expect(result.id1.length).toBe(2);
      expect(result.id2).toBeDefined();
      expect(result.id2.length).toBe(1);

      // Verify the correct marks are in each group
      expect(result.id1[0].name).toBe('Panel:test1:preRender');
      expect(result.id1[1].name).toBe('Panel:test1:renderStart');
      expect(result.id2[0].name).toBe('Panel:test2:preRender');
    });

    it('returns empty object when no marks match', () => {
      mockGetEntriesByType.mockReturnValue([]);
      const result = getPerformanceTrackersGroupedById('Panel');
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('clearPerformanceTrackersByType', () => {
    it('clears all marks of a given type', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Panel:test2:renderStart', startTime: 200, detail: { id: 'id2' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      clearPerformanceTrackersByType('Panel');

      expect(mockClearMarks).toHaveBeenCalledTimes(2);
      expect(mockClearMarks).toHaveBeenCalledWith('Panel:test1:preRender');
      expect(mockClearMarks).toHaveBeenCalledWith('Panel:test2:renderStart');
    });

    it('does nothing when no marks match', () => {
      mockGetEntriesByType.mockReturnValue([]);

      clearPerformanceTrackersByType('Panel');

      expect(mockClearMarks).not.toHaveBeenCalled();
    });
  });

  describe('findMarkerByNamePostfix', () => {
    it('finds a marker by name postfix', () => {
      const markers = [
        { name: 'Panel:test1:preRender', startTime: 100 },
        { name: 'Panel:test1:renderStart', startTime: 200 },
        { name: 'Panel:test1:renderComplete', startTime: 300 },
      ] as PerformanceMark[];

      const result = findMarkerByNamePostfix(markers, PERFORMANCE_TRACKER_MARKS.RENDER_START);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Panel:test1:renderStart');
      expect(result!.startTime).toBe(200);
    });

    it('returns undefined when no marker matches', () => {
      const markers = [
        { name: 'Panel:test1:preRender', startTime: 100 },
        { name: 'Panel:test1:renderComplete', startTime: 300 },
      ] as PerformanceMark[];

      const result = findMarkerByNamePostfix(markers, PERFORMANCE_TRACKER_MARKS.RENDER_START);

      expect(result).toBeUndefined();
    });
  });

  describe('getMeanFromPerformanceMeasures', () => {
    it('calculates the mean duration between start and end marks', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Panel:test1:renderStart', startTime: 200, detail: { id: 'id1' } },
        { name: 'Panel:test2:preRender', startTime: 300, detail: { id: 'id2' } },
        { name: 'Panel:test2:renderStart', startTime: 450, detail: { id: 'id2' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      const result = getMeanFromPerformanceMeasures({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        startMark: PERFORMANCE_TRACKER_MARKS.PRE_RENDER,
        endMark: PERFORMANCE_TRACKER_MARKS.RENDER_START,
      });

      // Mean of (200-100) and (450-300) = (100+150)/2 = 125
      expect(result).toBe(125);

      // Verify performance measures were created
      expect(mockMeasure).toHaveBeenCalledTimes(2);
      expect(mockMeasure).toHaveBeenCalledWith('Panel:test1:preRenderDuration', {
        start: 100,
        end: 200,
      });
      expect(mockMeasure).toHaveBeenCalledWith('Panel:test2:preRenderDuration', {
        start: 300,
        end: 450,
      });
    });

    it('skips creating performance measures when createPerformanceMeasures is false', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Panel:test1:renderStart', startTime: 200, detail: { id: 'id1' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      const result = getMeanFromPerformanceMeasures({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        startMark: PERFORMANCE_TRACKER_MARKS.PRE_RENDER,
        endMark: PERFORMANCE_TRACKER_MARKS.RENDER_START,
        createPerformanceMeasures: false,
      });

      expect(result).toBe(100);
      expect(mockMeasure).not.toHaveBeenCalled();
    });

    it('handles missing markers correctly', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        // Missing renderStart for id1
        { name: 'Panel:test2:preRender', startTime: 300, detail: { id: 'id2' } },
        { name: 'Panel:test2:renderStart', startTime: 450, detail: { id: 'id2' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      const result = getMeanFromPerformanceMeasures({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        startMark: PERFORMANCE_TRACKER_MARKS.PRE_RENDER,
        endMark: PERFORMANCE_TRACKER_MARKS.RENDER_START,
      });

      // Only one valid measurement (450-300 = 150)
      expect(result).toBe(75);

      // Only one performance measure should be created
      expect(mockMeasure).toHaveBeenCalledTimes(1);
      expect(mockMeasure).toHaveBeenCalledWith('Panel:test2:preRenderDuration', {
        start: 300,
        end: 450,
      });
    });

    it('returns 0 when no valid measurements are found', () => {
      mockGetEntriesByType.mockReturnValue([]);

      const result = getMeanFromPerformanceMeasures({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        startMark: PERFORMANCE_TRACKER_MARKS.PRE_RENDER,
        endMark: PERFORMANCE_TRACKER_MARKS.RENDER_START,
      });

      expect(result).toBe(0);
      expect(mockMeasure).not.toHaveBeenCalled();
    });

    it('extracts the marker name correctly to create the measure name', () => {
      const mockMarks = [
        { name: 'Panel:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Panel:test1:renderStart', startTime: 200, detail: { id: 'id1' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      getMeanFromPerformanceMeasures({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        startMark: PERFORMANCE_TRACKER_MARKS.PRE_RENDER,
        endMark: PERFORMANCE_TRACKER_MARKS.RENDER_START,
      });

      expect(mockMeasure).toHaveBeenCalledWith('Panel:test1:preRenderDuration', {
        start: 100,
        end: 200,
      });
    });
  });
});
