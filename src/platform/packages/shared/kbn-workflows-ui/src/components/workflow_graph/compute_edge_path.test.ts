/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@xyflow/react';
import {
  buildForkBusPath,
  buildMergeBusPath,
  buildRoundedOrthogonalPath,
  computeEdgePath,
} from './compute_edge_path';

const TRUNK = 24;

// Constants mirrored from compute_edge_path.ts so tests are self-documenting.
const CORNER_RADIUS = 16;
const FORK_BUS_TRUNK = 24;
const FORK_BUS_LABEL_OFFSET = CORNER_RADIUS + 18;
const MERGE_BUS_TRUNK = 24;
const TB_LABEL_Y_OFFSET = 30;
const TRUNK_LENGTH_TO_TARGET = 24;

describe('buildRoundedOrthogonalPath', () => {
  it('uses a 16px quadratic corner when both segments are long enough', () => {
    const { path } = buildRoundedOrthogonalPath(
      [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
      ],
      CORNER_RADIUS
    );
    expect(path).toContain(`Q 0 100 ${CORNER_RADIUS} 100`);
    expect(path).toContain(`Q 200 100 200 ${100 + CORNER_RADIUS}`);
  });
});

describe('buildMergeBusPath', () => {
  describe('TB (top-to-bottom)', () => {
    it('busY is targetY − trunk', () => {
      const r = buildMergeBusPath(
        { sourceX: 0, sourceY: 100, targetX: 100, targetY: 402 },
        false,
        TRUNK
      );
      expect(r.path).toContain(String(402 - TRUNK));
    });

    it('two edges sharing a target produce the same busY', () => {
      const target = { targetX: 100, targetY: 402 };
      const r1 = buildMergeBusPath({ sourceX: 0, sourceY: 100, ...target }, false, TRUNK);
      const r2 = buildMergeBusPath({ sourceX: 200, sourceY: 100, ...target }, false, TRUNK);
      // Both paths contain the shared busY
      const busY = target.targetY - TRUNK;
      expect(r1.path).toContain(String(busY));
      expect(r2.path).toContain(String(busY));
    });

    it('path starts near source and ends at target', () => {
      const r = buildMergeBusPath(
        { sourceX: 0, sourceY: 100, targetX: 100, targetY: 402 },
        false,
        TRUNK
      );
      expect(r.path).toMatch(/^M 0 /);
      expect(r.path).toContain('L 100 402');
    });

    it('uses a 16px quadratic corner at the source-side elbow', () => {
      const r = buildMergeBusPath(
        { sourceX: 0, sourceY: 100, targetX: 200, targetY: 250 },
        false,
        TRUNK
      );
      const busY = 250 - TRUNK;
      expect(r.path).toContain(`Q 0 ${busY} ${CORNER_RADIUS} ${busY}`);
    });
  });

  describe('LR (left-to-right)', () => {
    it('busX is targetX − trunk', () => {
      const r = buildMergeBusPath(
        { sourceX: 100, sourceY: 0, targetX: 402, targetY: 100 },
        true,
        TRUNK
      );
      const busX = 402 - TRUNK;
      expect(r.path).toContain(String(busX));
    });

    it('two edges sharing a target produce the same busX', () => {
      const target = { targetX: 402, targetY: 100 };
      const r1 = buildMergeBusPath({ sourceX: 100, sourceY: 0, ...target }, true, TRUNK);
      const r2 = buildMergeBusPath({ sourceX: 100, sourceY: 200, ...target }, true, TRUNK);
      const busX = target.targetX - TRUNK;
      expect(r1.path).toContain(String(busX));
      expect(r2.path).toContain(String(busX));
    });

    it('path starts near source and ends at target', () => {
      const r = buildMergeBusPath(
        { sourceX: 100, sourceY: 0, targetX: 402, targetY: 100 },
        true,
        TRUNK
      );
      expect(r.path).toMatch(/^M 98 0/);
      expect(r.path).toContain('L 402 100');
    });
  });
});

describe('buildForkBusPath', () => {
  describe('TB (top-to-bottom)', () => {
    it('label sits on the vertical drop, past the rounded corner', () => {
      const r = buildForkBusPath(
        { sourceX: 150, sourceY: 100, targetX: 300, targetY: 250 },
        false,
        TRUNK
      );
      const busY = 100 + TRUNK;
      expect(r.labelX).toBe(300);
      expect(r.labelY).toBe(busY + FORK_BUS_LABEL_OFFSET);
      expect(r.labelY - busY).toBeGreaterThan(CORNER_RADIUS);
    });

    it('aligned row: same labelY regardless of sibling targetX or targetY', () => {
      const base = { sourceX: 150, sourceY: 100 };
      const r1 = buildForkBusPath({ ...base, targetX: 200, targetY: 250 }, false, TRUNK);
      const r2 = buildForkBusPath({ ...base, targetX: 400, targetY: 350 }, false, TRUNK);
      // Both share sourceY → same busY → same labelY on the drop
      expect(r1.labelY).toBe(r2.labelY);
    });

    it('path is non-empty and starts at the source', () => {
      const r = buildForkBusPath(
        { sourceX: 150, sourceY: 100, targetX: 300, targetY: 250 },
        false,
        TRUNK
      );
      expect(r.path.length).toBeGreaterThan(0);
      // Path starts with M <sourceX> <sourceY - 2>
      expect(r.path).toMatch(/^M 150 98/);
    });
  });

  describe('LR (left-to-right)', () => {
    it('label sits on the horizontal drop, past the rounded corner', () => {
      const r = buildForkBusPath(
        { sourceX: 100, sourceY: 150, targetX: 350, targetY: 300 },
        true,
        TRUNK
      );
      const busX = 100 + TRUNK;
      expect(r.labelX).toBe(busX + FORK_BUS_LABEL_OFFSET);
      expect(r.labelY).toBe(300);
      expect(r.labelX - busX).toBeGreaterThan(CORNER_RADIUS);
    });

    it('aligned column: same labelX regardless of sibling targetX or targetY', () => {
      const base = { sourceX: 100, sourceY: 150 };
      const r1 = buildForkBusPath({ ...base, targetX: 300, targetY: 200 }, true, TRUNK);
      const r2 = buildForkBusPath({ ...base, targetX: 500, targetY: 400 }, true, TRUNK);
      // Both share sourceX → same busX → same labelX on the drop
      expect(r1.labelX).toBe(r2.labelX);
    });

    it('path is non-empty and starts at the source', () => {
      const r = buildForkBusPath(
        { sourceX: 100, sourceY: 150, targetX: 350, targetY: 300 },
        true,
        TRUNK
      );
      expect(r.path.length).toBeGreaterThan(0);
      // Path starts with M <sourceX - 2> <sourceY>
      expect(r.path).toMatch(/^M 98 150/);
    });
  });
});

describe('computeEdgePath', () => {
  describe('fork-bus routing (branchType + gap > trunk)', () => {
    it('TB then-branch: busY is sourceY + FORK_BUS_TRUNK', () => {
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 300,
        targetY: 250,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        branchType: 'then',
      });
      const busY = 100 + FORK_BUS_TRUNK;
      expect(r.path).toContain(String(busY));
    });

    it('TB else-branch and then-branch share the same busY (same source)', () => {
      const sharedSource = {
        sourceX: 200,
        sourceY: 100,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
      const rThen = computeEdgePath({
        ...sharedSource,
        targetX: 100,
        targetY: 250,
        branchType: 'then',
      });
      const rElse = computeEdgePath({
        ...sharedSource,
        targetX: 400,
        targetY: 350,
        branchType: 'else',
      });
      // Both branch from the same source → same busY = sourceY + FORK_BUS_TRUNK
      const busY = 100 + FORK_BUS_TRUNK;
      expect(rThen.path).toContain(String(busY));
      expect(rElse.path).toContain(String(busY));
    });

    it('switch case routes via fork bus', () => {
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 350,
        targetY: 280,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        branchType: 'switch',
      });
      const busY = 100 + FORK_BUS_TRUNK;
      expect(r.path).toContain(String(busY));
    });
  });

  describe('merge-bus routing (isMerge + gap > trunk)', () => {
    it('TB merge: busY is targetY − MERGE_BUS_TRUNK', () => {
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 100,
        targetY: 402,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        isMerge: true,
      });
      const busY = 402 - MERGE_BUS_TRUNK;
      expect(r.path).toContain(String(busY));
    });

    it('two isMerge edges sharing a target produce the same busY', () => {
      const shared = {
        targetX: 100,
        targetY: 402,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        isMerge: true as const,
      };
      const r1 = computeEdgePath({ sourceX: 0, sourceY: 100, ...shared });
      const r2 = computeEdgePath({ sourceX: 200, sourceY: 100, ...shared });
      const busY = 402 - MERGE_BUS_TRUNK;
      expect(r1.path).toContain(String(busY));
      expect(r2.path).toContain(String(busY));
    });
  });

  describe('dagre-waypoints TB routing', () => {
    it('effectively-straight chain: path starts and ends on the source X', () => {
      // xSpread = 0 < STRAIGHT_X_THRESHOLD(100) → straight path
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 200,
        targetY: 300,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        points: [
          { x: 200, y: 100 },
          { x: 200, y: 300 },
        ],
      });
      expect(r.path).toMatch(/^M 200 /);
      expect(r.path).toContain('L 200 300');
      expect(r.labelX).toBe(200);
      expect(r.labelY).toBe(100 + TB_LABEL_Y_OFFSET);
    });

    it('branching chain: trunkTargetY appears in the path', () => {
      // xSpread = 200 >= STRAIGHT_X_THRESHOLD(100) → branching trunk-stub path
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 400,
        targetY: 400,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        points: [
          { x: 200, y: 100 },
          { x: 200, y: 200 },
          { x: 400, y: 200 },
          { x: 400, y: 400 },
        ],
      });
      // trunkTargetY = targetY - TRUNK_LENGTH_TO_TARGET = 400 - 24 = 376
      const trunkTargetY = 400 - TRUNK_LENGTH_TO_TARGET;
      expect(r.path).toContain(String(trunkTargetY));
      expect(r.labelX).toBe(400); // targetX
      expect(r.labelY).toBe(100 + TB_LABEL_Y_OFFSET);
    });
  });

  describe('dagre-waypoints LR routing', () => {
    it('LR chain: trunkTargetX appears in the path and label lands at (mid, targetY)', () => {
      const r = computeEdgePath({
        sourceX: 100,
        sourceY: 200,
        targetX: 400,
        targetY: 400,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        points: [
          { x: 100, y: 200 },
          { x: 100, y: 200 },
          { x: 100, y: 400 },
          { x: 400, y: 400 },
        ],
      });
      // trunkTargetX = targetX - TRUNK_LENGTH_TO_TARGET = 400 - 24 = 376
      const trunkTargetX = 400 - TRUNK_LENGTH_TO_TARGET;
      expect(r.path).toContain(String(trunkTargetX));
      expect(r.labelX).toBe((100 + 400) / 2); // (sourceX + targetX) / 2
      expect(r.labelY).toBe(400); // targetY
    });
  });

  describe('smooth-step fallback (no points, no fork/merge)', () => {
    it('returns a non-empty path with labelX between source and target', () => {
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 300,
        targetY: 300,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      expect(r.path.length).toBeGreaterThan(0);
      expect(r.labelX).toBeGreaterThanOrEqual(200);
      expect(r.labelX).toBeLessThanOrEqual(300);
      expect(r.labelY).toBeGreaterThanOrEqual(100);
      expect(r.labelY).toBeLessThanOrEqual(300);
    });

    it('does NOT use fork bus for a plain sequential edge (no branchType)', () => {
      // Fork bus busY would be sourceY + FORK_BUS_TRUNK = 100 + 24 = 124.
      // Smooth-step midY = (100 + 300) / 2 = 200 — clearly different.
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 200,
        targetY: 300,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      const forkBusY = 100 + FORK_BUS_TRUNK;
      // Path should not contain the fork busY
      expect(r.path).not.toContain(` ${forkBusY} `);
    });

    it('uses a 16px corner on an offset sequential edge', () => {
      const r = computeEdgePath({
        sourceX: 200,
        sourceY: 100,
        targetX: 400,
        targetY: 300,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      const qs = [...r.path.matchAll(/Q\s+([\d.]+)[,\s]+([\d.]+)\s+([\d.]+)[,\s]+([\d.]+)/g)];
      expect(qs.length).toBeGreaterThan(0);
      for (const m of qs) {
        const ctrlX = Number(m[1]);
        const ctrlY = Number(m[2]);
        const endX = Number(m[3]);
        const endY = Number(m[4]);
        const dx = Math.abs(endX - ctrlX);
        const dy = Math.abs(endY - ctrlY);
        expect(Math.max(dx, dy)).toBe(CORNER_RADIUS);
      }
    });
  });
});
