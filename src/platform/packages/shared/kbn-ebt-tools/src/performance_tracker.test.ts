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
} from './performance_tracker';

// Mock the performance API
const mockMark = jest.fn();
const mockGetEntriesByType = jest.fn();
const mockClearMarks = jest.fn();

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
        instance: 'testInstance',
      });

      expect(tracker).toHaveProperty('mark');
      expect(typeof tracker.mark).toBe('function');
      expect(uuidv4).toHaveBeenCalledTimes(1);
    });

    it('generates mark names with the correct format', () => {
      const tracker = createPerformanceTracker({
        type: PERFORMANCE_TRACKER_TYPES.PANEL,
        instance: 'testInstance',
      });

      tracker.mark(PERFORMANCE_TRACKER_MARKS.PRE_RENDER);

      expect(mockMark).toHaveBeenCalledWith('Lens:testInstance:preRender', {
        detail: { id: 'test-uuid' },
      });
    });
  });

  describe('getPerformanceTrackersByType', () => {
    it('filters marks by type prefix', () => {
      const mockMarks = [
        { name: 'Lens:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Lens:test2:renderStart', startTime: 200, detail: { id: 'id2' } },
        { name: 'Other:test:preRender', startTime: 300, detail: { id: 'id3' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      const result = getPerformanceTrackersByType('Panel');

      expect(mockGetEntriesByType).toHaveBeenCalledWith('mark');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Lens:test1:preRender');
      expect(result[1].name).toBe('Lens:test2:renderStart');
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
        { name: 'Lens:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Lens:test1:renderStart', startTime: 200, detail: { id: 'id1' } },
        { name: 'Lens:test2:preRender', startTime: 300, detail: { id: 'id2' } },
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
      expect(result.id1[0].name).toBe('Lens:test1:preRender');
      expect(result.id1[1].name).toBe('Lens:test1:renderStart');
      expect(result.id2[0].name).toBe('Lens:test2:preRender');
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
        { name: 'Lens:test1:preRender', startTime: 100, detail: { id: 'id1' } },
        { name: 'Lens:test2:renderStart', startTime: 200, detail: { id: 'id2' } },
      ];

      mockGetEntriesByType.mockReturnValue(mockMarks);

      clearPerformanceTrackersByType('Panel');

      expect(mockClearMarks).toHaveBeenCalledTimes(2);
      expect(mockClearMarks).toHaveBeenCalledWith('Lens:test1:preRender');
      expect(mockClearMarks).toHaveBeenCalledWith('Lens:test2:renderStart');
    });

    it('does nothing when no marks match', () => {
      mockGetEntriesByType.mockReturnValue([]);

      clearPerformanceTrackersByType('Panel');

      expect(mockClearMarks).not.toHaveBeenCalled();
    });
  });
});
