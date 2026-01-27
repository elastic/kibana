/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCriticalPath } from './get_critical_path';
import type { CriticalPathBase } from './types';

interface TestItem extends CriticalPathBase {
  name: string;
}

function createItem(
  id: string,
  offset: number,
  duration: number,
  skew: number = 0,
  name?: string
): TestItem {
  return { id, offset, duration, skew, name: name ?? id };
}

describe('getCriticalPath', () => {
  describe('when root is undefined', () => {
    it('should return empty segments', () => {
      const result = getCriticalPath(undefined, {});
      expect(result.segments).toEqual([]);
    });
  });

  describe('when root has no children', () => {
    it('should return two segments: one for the span and one for self time', () => {
      const root = createItem('root', 0, 1000);
      const result = getCriticalPath(root, {});

      expect(result.segments).toHaveLength(2);

      // First segment is the span itself (self: false)
      expect(result.segments[0]).toEqual({
        item: root,
        offset: 0,
        duration: 1000,
        self: false,
      });

      // Second segment is the self time (self: true)
      expect(result.segments[1]).toEqual({
        item: root,
        offset: 0,
        duration: 1000,
        self: true,
      });
    });

    it('should handle root with skew', () => {
      const root = createItem('root', 100, 500, 50);
      const result = getCriticalPath(root, {});

      expect(result.segments).toHaveLength(2);

      // Start time should be offset + skew = 150
      expect(result.segments[0]).toEqual({
        item: root,
        offset: 150,
        duration: 500,
        self: false,
      });

      expect(result.segments[1]).toEqual({
        item: root,
        offset: 150,
        duration: 500,
        self: true,
      });
    });
  });

  describe('when root has a single child that spans the entire duration', () => {
    it('should include both root and child in critical path', () => {
      const root = createItem('root', 0, 1000);
      const child = createItem('child', 0, 1000);

      const childrenByParentId = {
        root: [child],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Should have segments for root and child
      const rootSegments = result.segments.filter((s) => s.item.id === 'root');
      const childSegments = result.segments.filter((s) => s.item.id === 'child');

      expect(rootSegments.length).toBeGreaterThanOrEqual(1);
      expect(childSegments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('when root has a child that starts later', () => {
    it('should add self segment for the gap at the start', () => {
      const root = createItem('root', 0, 1000);
      const child = createItem('child', 200, 800); // starts at 200, ends at 1000

      const childrenByParentId = {
        root: [child],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Find self segment for root at the start
      const rootSelfSegments = result.segments.filter(
        (s) => s.item.id === 'root' && s.self === true
      );

      // Should have a self segment for the gap (0-200)
      const gapSegment = rootSelfSegments.find((s) => s.offset === 0);
      expect(gapSegment).toBeDefined();
      expect(gapSegment?.duration).toBe(200);
    });
  });

  describe('when root has a child that ends earlier', () => {
    it('should add self segment for the gap at the end if gap is larger than 1000ms', () => {
      const root = createItem('root', 0, 5000);
      const child = createItem('child', 0, 2000); // ends at 2000, gap of 3000ms

      const childrenByParentId = {
        root: [child],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Find self segments for root
      const rootSelfSegments = result.segments.filter(
        (s) => s.item.id === 'root' && s.self === true
      );

      // Should have a self segment for the gap at the end (2000-5000)
      const gapSegment = rootSelfSegments.find((s) => s.offset === 2000);
      expect(gapSegment).toBeDefined();
      expect(gapSegment?.duration).toBe(3000);
    });
  });

  describe('when root has multiple children', () => {
    it('should order children by end time and scan from latest to earliest', () => {
      const root = createItem('root', 0, 1000);
      const child1 = createItem('child1', 0, 400); // ends at 400
      const child2 = createItem('child2', 400, 600); // ends at 1000

      const childrenByParentId = {
        root: [child1, child2],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Both children should be on the critical path
      const child1Segments = result.segments.filter((s) => s.item.id === 'child1');
      const child2Segments = result.segments.filter((s) => s.item.id === 'child2');

      expect(child1Segments.length).toBeGreaterThanOrEqual(1);
      expect(child2Segments.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle overlapping children correctly', () => {
      const root = createItem('root', 0, 1000);
      const child1 = createItem('child1', 0, 600); // ends at 600
      const child2 = createItem('child2', 300, 700); // starts at 300, ends at 1000

      const childrenByParentId = {
        root: [child1, child2],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // child2 ends later so it should be scanned first
      // child1 ends at 600 but child2 starts at 300, so child1 contributes from 0-300
      expect(result.segments.length).toBeGreaterThan(0);
    });
  });

  describe('when there are nested children', () => {
    it('should recursively scan nested children', () => {
      const root = createItem('root', 0, 1000);
      const child = createItem('child', 0, 1000);
      const grandchild = createItem('grandchild', 0, 1000);

      const childrenByParentId = {
        root: [child],
        child: [grandchild],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // All three items should be in the critical path
      const rootSegments = result.segments.filter((s) => s.item.id === 'root');
      const childSegments = result.segments.filter((s) => s.item.id === 'child');
      const grandchildSegments = result.segments.filter((s) => s.item.id === 'grandchild');

      expect(rootSegments.length).toBeGreaterThanOrEqual(1);
      expect(childSegments.length).toBeGreaterThanOrEqual(1);
      expect(grandchildSegments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('when children have skew', () => {
    it('should account for skew in start time calculations', () => {
      const root = createItem('root', 0, 1000);
      const child = createItem('child', 0, 800, 100); // effective start: 100, effective end: 900

      const childrenByParentId = {
        root: [child],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // There should be self segments for root at start (0-100) and end (900-1000)
      const rootSelfSegments = result.segments.filter(
        (s) => s.item.id === 'root' && s.self === true
      );

      expect(rootSelfSegments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle child that starts before root scan period', () => {
      const root = createItem('root', 100, 500);
      const child = createItem('child', 50, 600); // starts before root

      const childrenByParentId = {
        root: [child],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Should not throw and should produce valid segments
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('should handle child that ends after root', () => {
      const root = createItem('root', 0, 500);
      const child = createItem('child', 0, 700); // ends after root

      const childrenByParentId = {
        root: [child],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Should not throw and should produce valid segments
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('should handle empty children array', () => {
      const root = createItem('root', 0, 1000);

      const childrenByParentId = {
        root: [],
      };

      const result = getCriticalPath(root, childrenByParentId);

      // Should behave like no children case
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].self).toBe(false);
      expect(result.segments[1].self).toBe(true);
    });

    it('should handle zero duration', () => {
      const root = createItem('root', 0, 0);

      const result = getCriticalPath(root, {});

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].duration).toBe(0);
      expect(result.segments[1].duration).toBe(0);
    });
  });
});
