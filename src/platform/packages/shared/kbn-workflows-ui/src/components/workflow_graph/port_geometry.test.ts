/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ERROR_PORT_ALONG,
  ERROR_PORT_FRACTION,
  ERROR_PORT_TRAIL_T,
  errorPortCenter,
  errorPortEdgeStyle,
  FLOW_BAND_END,
  FLOW_BAND_START,
  flowPortAlong,
  flowPortFraction,
  IF_PORT_FALSE,
  IF_PORT_TRUE,
  PORT_EDGE_OUTSET,
  PORT_HIT_SIZE,
  STEP_PORT,
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

  describe('edge-anchored control geometry', () => {
    it('places controls ≈15px outside the source edge with ≥44px hit targets', () => {
      expect(PORT_HIT_SIZE).toBeGreaterThanOrEqual(44);
      expect(PORT_EDGE_OUTSET).toBe(15);
    });

    it('TB: error port sits on the bottom border near the start of the trailing band', () => {
      const bounds = { minX: 10, minY: 20, maxX: 310, maxY: 84 };
      const center = errorPortCenter(bounds, 'TB');
      expect(center.y).toBe(bounds.maxY);
      expect(center.x).toBe(bounds.minX + 300 * ERROR_PORT_FRACTION);
      expect(ERROR_PORT_FRACTION).toBeCloseTo(
        FLOW_BAND_END + (1 - FLOW_BAND_END) * ERROR_PORT_TRAIL_T
      );
      expect(ERROR_PORT_FRACTION).toBeGreaterThan(FLOW_BAND_END);
      expect(ERROR_PORT_FRACTION).toBeLessThan(0.8);
    });

    it('LR: error stays on the bottom edge, identical to TB', () => {
      const bounds = { minX: 10, minY: 20, maxX: 310, maxY: 84 };
      const errTb = errorPortCenter(bounds, 'TB');
      const errLr = errorPortCenter(bounds, 'LR');
      expect(errLr).toEqual(errTb);
      expect(errLr.x).toBe(bounds.minX + 300 * ERROR_PORT_FRACTION);
      expect(errLr.y).toBe(bounds.maxY);
    });

    it('errorPortEdgeStyle straddles the bottom border with the hit box', () => {
      const style = errorPortEdgeStyle();
      expect(style.left).toBe(ERROR_PORT_ALONG);
      expect(style.bottom).toBe(-(PORT_HIT_SIZE / 2));
      expect(style.transform).toBe('translateX(-50%)');
    });
  });
});
