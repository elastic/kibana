/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import type { GraphEdge } from '@kbn/workflows';
import {
  ERROR_EDGE_CLEARANCE,
  computeErrorBranchNodeOrigin,
  enforceErrorBranchPlacement,
  errorLaneStep,
  isErrorLaneOccupied,
  resolveErrorBranchPlacement,
} from './error_branch_placement';
import { ERROR_PORT_INSET } from './port_geometry';
import { WORKFLOW_NODE_SEP, WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

describe('error_branch_placement', () => {
  describe('computeErrorBranchNodeOrigin', () => {
    const owner = { minX: 0, minY: 0, maxX: 300, maxY: 64 };

    it('TB: one column right and one rank below', () => {
      expect(computeErrorBranchNodeOrigin(owner, 'TB')).toEqual({
        x: 300 + WORKFLOW_NODE_SEP,
        y: 64 + WORKFLOW_RANK_SEP,
      });
    });

    it('LR: one rank right and one lane below', () => {
      expect(computeErrorBranchNodeOrigin(owner, 'LR')).toEqual({
        x: 300 + WORKFLOW_RANK_SEP,
        y: 64 + WORKFLOW_NODE_SEP,
      });
    });
  });

  describe('isErrorLaneOccupied', () => {
    it('detects a sibling sitting in the horizontal-run band', () => {
      const ownerBottom = 64;
      const laneY = 64 + WORKFLOW_RANK_SEP;
      const dropX = 300 - ERROR_PORT_INSET;
      const fallbackLeft = 300 + WORKFLOW_NODE_SEP;
      expect(
        isErrorLaneOccupied({
          laneY,
          laneHeight: 64,
          dropX,
          fallbackLeft,
          ownerBottom,
          obstacles: [{ x: fallbackLeft - 10, y: laneY, width: 300, height: 64 }],
        })
      ).toBe(true);
    });

    it('ignores obstacles outside the edge span', () => {
      const laneY = 64 + WORKFLOW_RANK_SEP;
      expect(
        isErrorLaneOccupied({
          laneY,
          laneHeight: 64,
          dropX: 276,
          fallbackLeft: 350,
          ownerBottom: 64,
          obstacles: [{ x: 800, y: laneY, width: 300, height: 64 }],
        })
      ).toBe(false);
    });
  });

  describe('resolveErrorBranchPlacement', () => {
    const owner = { minX: 0, minY: 0, maxX: 300, maxY: 64 };
    const size = { width: 300, height: 64 };

    it('uses the ideal lane when clear', () => {
      const { origin, shifts } = resolveErrorBranchPlacement({
        owner,
        fallbackSize: size,
        obstacles: [],
        direction: 'TB',
      });
      expect(origin).toEqual(computeErrorBranchNodeOrigin(owner, 'TB'));
      expect(shifts.size).toBe(0);
    });

    it('inserts a lane (shifts the sibling) when the false branch occupies the row below', () => {
      // LR-style: false branch sits one lane below the true-branch owner.
      const ideal = computeErrorBranchNodeOrigin(owner, 'TB');
      const sibling = {
        x: ideal.x - 20,
        y: ideal.y,
        width: 300,
        height: 64,
      };
      const { origin, shifts } = resolveErrorBranchPlacement({
        owner,
        fallbackSize: size,
        obstacles: [sibling],
        direction: 'TB',
        obstacleIds: ['false-sibling'],
      });
      expect(origin).toEqual(ideal);
      expect(shifts.get('false-sibling')).toEqual({
        dx: 0,
        dy: errorLaneStep(64, 'TB'),
      });
      // After the shift, the horizontal run is no longer colinear with the sibling.
      const shiftedSibling = { ...sibling, y: sibling.y + errorLaneStep(64, 'TB') };
      expect(
        isErrorLaneOccupied({
          laneY: origin.y,
          laneHeight: 64,
          dropX: owner.maxX - ERROR_PORT_INSET,
          fallbackLeft: origin.x,
          ownerBottom: owner.maxY,
          obstacles: [shiftedSibling],
        })
      ).toBe(false);
    });
  });

  describe('enforceErrorBranchPlacement', () => {
    it('pins a solo failure fallback to the below+right slot', () => {
      const nodes: DagPositionedNode[] = [
        { id: 'a', x: 0, y: 0, width: 300, height: 64 },
        { id: 'fb', x: 10, y: 10, width: 300, height: 64 },
      ];
      const edges: DagPositionedEdge[] = [
        { id: 'e1', source: 'a', target: 'fb', points: [{ x: 0, y: 0 }] },
      ];
      const domainEdges = [
        { id: 'e1', source: 'a', target: 'fb', isFailure: true },
      ] as GraphEdge[];

      const result = enforceErrorBranchPlacement({
        nodes,
        edges,
        domainEdges,
        direction: 'TB',
      });
      const fb = result.nodes.find((n) => n.id === 'fb')!;
      expect(fb.x).toBe(300 + WORKFLOW_NODE_SEP);
      expect(fb.y).toBe(64 + WORKFLOW_RANK_SEP);
      expect(result.edges[0].points).toEqual([]);
    });

    it('shifts a sibling row down when inserting an error lane from the true branch', () => {
      const ownerY = 0;
      const idealY = 64 + WORKFLOW_RANK_SEP;
      const nodes: DagPositionedNode[] = [
        { id: 'true', x: 0, y: ownerY, width: 300, height: 64 },
        { id: 'false', x: 350, y: idealY, width: 300, height: 64 },
        { id: 'fb', x: 0, y: 0, width: 300, height: 64 },
      ];
      const edges: DagPositionedEdge[] = [
        { id: 'fail', source: 'true', target: 'fb', points: [{ x: 1, y: 1 }] },
      ];
      const domainEdges = [
        { id: 'fail', source: 'true', target: 'fb', isFailure: true },
      ] as GraphEdge[];

      const result = enforceErrorBranchPlacement({
        nodes,
        edges,
        domainEdges,
        direction: 'TB',
      });
      const fb = result.nodes.find((n) => n.id === 'fb')!;
      const falseNode = result.nodes.find((n) => n.id === 'false')!;
      expect(fb.y).toBe(idealY);
      expect(falseNode.y).toBe(idealY + errorLaneStep(64, 'TB'));
      expect(falseNode.y).toBeGreaterThanOrEqual(fb.y + 64 + ERROR_EDGE_CLEARANCE);
    });
  });
});
