/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSwitchBusPath } from './workflow_graph_edge';

const TRUNK = 20;

describe('buildSwitchBusPath', () => {
  describe('TB (top-to-bottom)', () => {
    it('label X is the target X (on the vertical drop)', () => {
      const r = buildSwitchBusPath(
        { sourceX: 150, sourceY: 100, targetX: 300, targetY: 250 },
        false,
        TRUNK
      );
      expect(r.labelX).toBe(300);
    });

    it('label Y is between busY and targetY (within the drop)', () => {
      const r = buildSwitchBusPath(
        { sourceX: 150, sourceY: 100, targetX: 300, targetY: 250 },
        false,
        TRUNK
      );
      const busY = 100 + TRUNK;
      expect(r.labelY).toBeGreaterThan(busY);
      expect(r.labelY).toBeLessThan(250);
    });

    it('flat bus + aligned row: same labelY regardless of sibling targetX or targetY', () => {
      const base = { sourceX: 150, sourceY: 100 };
      const r1 = buildSwitchBusPath({ ...base, targetX: 200, targetY: 250 }, false, TRUNK);
      const r2 = buildSwitchBusPath({ ...base, targetX: 400, targetY: 350 }, false, TRUNK);
      // Both share sourceY → same busY → same fixed-offset labelY
      expect(r1.labelY).toBe(r2.labelY);
    });

    it('path is non-empty and starts at the source', () => {
      const r = buildSwitchBusPath(
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
    it('label Y is the target Y (on the horizontal drop)', () => {
      const r = buildSwitchBusPath(
        { sourceX: 100, sourceY: 150, targetX: 350, targetY: 300 },
        true,
        TRUNK
      );
      expect(r.labelY).toBe(300);
    });

    it('label X is between busX and targetX (within the drop)', () => {
      const r = buildSwitchBusPath(
        { sourceX: 100, sourceY: 150, targetX: 350, targetY: 300 },
        true,
        TRUNK
      );
      const busX = 100 + TRUNK;
      expect(r.labelX).toBeGreaterThan(busX);
      expect(r.labelX).toBeLessThan(350);
    });

    it('flat bus + aligned column: same labelX regardless of sibling targetX or targetY', () => {
      const base = { sourceX: 100, sourceY: 150 };
      const r1 = buildSwitchBusPath({ ...base, targetX: 300, targetY: 200 }, true, TRUNK);
      const r2 = buildSwitchBusPath({ ...base, targetX: 500, targetY: 400 }, true, TRUNK);
      // Both share sourceX → same busX → same fixed-offset labelX
      expect(r1.labelX).toBe(r2.labelX);
    });

    it('path is non-empty and starts at the source', () => {
      const r = buildSwitchBusPath(
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
