/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ERROR_PORT_INSET,
  FLOW_BAND_END,
  FLOW_BAND_START,
  FLOW_PORT_MIN_GAP,
  FLOW_TO_ERROR_MIN_GAP,
  IF_PORT_FALSE,
  IF_PORT_TRUE,
  PORT_HIT_SIZE,
  PORT_STRADDLE_OUTSET,
  STEP_PORT,
  errorPortCenter,
  errorPortEdgeStyle,
  expandedPortCenters,
  expandedPortsClear,
  flowPortAlong,
  flowPortFraction,
  minCrossSizeForPorts,
  portCenterOnSourceEdge,
} from './port_geometry';

describe('port_geometry', () => {
  describe('flowPortFraction / flowPortAlong (count-driven)', () => {
    it('places a single flow port at 50%', () => {
      expect(flowPortFraction(0, 1)).toBe(0.5);
      expect(flowPortAlong(0, 1)).toBe('50%');
      expect(STEP_PORT).toBe('50%');
    });

    it('places two ports at 32% / 68% (if true → false)', () => {
      expect(flowPortFraction(0, 2)).toBeCloseTo(FLOW_BAND_START);
      expect(flowPortFraction(1, 2)).toBeCloseTo(FLOW_BAND_END);
      expect(IF_PORT_TRUE).toBe('32%');
      expect(IF_PORT_FALSE).toBe('68%');
    });

    it('distributes N=3 evenly across the 32–68 band', () => {
      expect(flowPortFraction(0, 3)).toBeCloseTo(0.32);
      expect(flowPortFraction(1, 3)).toBeCloseTo(0.5);
      expect(flowPortFraction(2, 3)).toBeCloseTo(0.68);
    });

    it('distributes N=4 evenly across the 32–68 band', () => {
      expect(flowPortFraction(0, 4)).toBeCloseTo(0.32);
      expect(flowPortFraction(1, 4)).toBeCloseTo(0.44);
      expect(flowPortFraction(2, 4)).toBeCloseTo(0.56);
      expect(flowPortFraction(3, 4)).toBeCloseTo(0.68);
    });
  });

  describe('minCrossSizeForPorts', () => {
    it('requires enough span for the 28px flow-flow gap', () => {
      const min = minCrossSizeForPorts(2, false);
      expect(min * (FLOW_BAND_END - FLOW_BAND_START)).toBeGreaterThanOrEqual(FLOW_PORT_MIN_GAP);
    });

    it('requires enough span for the last-flow → error gap', () => {
      const min = minCrossSizeForPorts(1, true);
      const lastFlowX = flowPortFraction(0, 1) * min;
      const errorX = min - ERROR_PORT_INSET;
      expect(errorX - lastFlowX).toBeGreaterThanOrEqual(FLOW_TO_ERROR_MIN_GAP);
    });

    it('keeps gaps on a default 300px node for step+error and if (2 flow)', () => {
      const width = 300;
      expect(width).toBeGreaterThanOrEqual(minCrossSizeForPorts(1, true));
      expect(width).toBeGreaterThanOrEqual(minCrossSizeForPorts(2, false));
    });
  });

  describe('straddle + edge origin geometry', () => {
    it('defines straddle outset as half the hit target (≥22px)', () => {
      expect(PORT_HIT_SIZE).toBeGreaterThanOrEqual(22);
      expect(PORT_STRADDLE_OUTSET).toBe(PORT_HIT_SIZE / 2);
    });

    it('TB: flow port center Y equals node bottom-border Y; edge starts there', () => {
      const bounds = { minX: 10, minY: 20, maxX: 310, maxY: 84 };
      const center = portCenterOnSourceEdge(bounds, 0.5, 'TB');
      expect(center.y).toBe(bounds.maxY);
      expect(center.x).toBe(10 + 300 * 0.5);
    });

    it('TB: error port center sits on the bottom border at the right inset', () => {
      const bounds = { minX: 10, minY: 20, maxX: 310, maxY: 84 };
      const center = errorPortCenter(bounds, 'TB');
      expect(center.y).toBe(bounds.maxY);
      expect(center.x).toBe(bounds.maxX - ERROR_PORT_INSET);
    });

    it('LR: flow on the right edge; error stays bottom-right (same as TB)', () => {
      const bounds = { minX: 10, minY: 20, maxX: 310, maxY: 84 };
      const flow = portCenterOnSourceEdge(bounds, 0.32, 'LR');
      expect(flow.x).toBe(bounds.maxX);
      expect(flow.y).toBeCloseTo(20 + 64 * 0.32);
      const errTb = errorPortCenter(bounds, 'TB');
      const errLr = errorPortCenter(bounds, 'LR');
      expect(errLr).toEqual(errTb);
      expect(errLr.x).toBe(bounds.maxX - ERROR_PORT_INSET);
      expect(errLr.y).toBe(bounds.maxY);
    });

    it('errorPortEdgeStyle is orientation-invariant (bottom + right inset)', () => {
      const style = errorPortEdgeStyle();
      expect(style.right).toBe(ERROR_PORT_INSET);
      expect(style.bottom).toBe(-PORT_STRADDLE_OUTSET);
      expect(style.transform).toBe('translateX(50%)');
    });
  });

  describe('expandedPortsClear (no-overlap regression)', () => {
    it('keeps expanded ports clear when the node meets minCrossSizeForPorts', () => {
      const cases: Array<{
        direction: 'TB' | 'LR';
        flowCount: number;
        hasError: boolean;
      }> = [
        { direction: 'TB', flowCount: 1, hasError: true },
        { direction: 'LR', flowCount: 1, hasError: true },
        { direction: 'TB', flowCount: 2, hasError: false },
        { direction: 'LR', flowCount: 2, hasError: false },
        // Hypothetical if+error once the engine allows it:
        { direction: 'TB', flowCount: 2, hasError: true },
        { direction: 'LR', flowCount: 2, hasError: true },
      ];

      for (const { direction, flowCount, hasError } of cases) {
        // Width always carries the bottom-edge flow↔error (and TB flow↔flow) rule.
        const width = Math.max(300, minCrossSizeForPorts(flowCount, hasError));
        // Height carries LR flow↔flow; error is on a different edge.
        const height = Math.max(64, minCrossSizeForPorts(flowCount, false));
        expect(expandedPortsClear(width, height, flowCount, hasError, direction)).toBe(
          true
        );
      }
    });

    it('LR step+error: flow on right and error on bottom never share an edge', () => {
      const centers = expandedPortCenters(300, 64, 1, true, 'LR');
      const flow = centers.find((c) => c.kind === 'flow')!;
      const err = centers.find((c) => c.kind === 'error')!;
      expect(flow.x).toBe(300);
      expect(err.y).toBe(64);
      expect(err.x).not.toBe(flow.x);
    });
  });
});
