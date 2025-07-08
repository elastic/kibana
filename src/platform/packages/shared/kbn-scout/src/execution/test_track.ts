/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import { z } from '@kbn/zod';

export class TestTrackError extends Error {
  // Base exception for test track errors
}

export const TestTrackSpecSchema = z.object({
  stats: z.object({
    lane: z.object({
      count: z.number().int(),
      saturationPercent: z.number(),
      longestEstimate: z.number(),
      shortestEstimate: z.number(),
    }),
    combinedRuntime: z.object({
      target: z.number().int(),
      expected: z.number().int(),
      unused: z.number().int(),
      overflow: z.number().int(),
    }),
  }),
  lanes: z.array(
    z.object({
      number: z.number().int(),
      runtimeTarget: z.number().int(),
      runtimeEstimate: z.number(),
      availableCapacity: z.number(),
      status: z.enum(['open', 'closed']),
      isCongested: z.boolean(),
      loads: z.array(z.string()),
    })
  ),
});

export type TestTrackSpec = z.infer<typeof TestTrackSpecSchema>;
export type TestTrackLaneStatus = z.infer<
  typeof TestTrackSpecSchema.shape.lanes.element.shape.status
>;

export const TestTrackLoadSchema = z.object({
  id: z.string(),
  stats: z.object({
    runCount: z.number().int(),
    runtime: z.object({
      avg: z.number().int(),
      median: z.number().int(),
      pc95th: z.number().int(),
      pc99th: z.number().int(),
      max: z.number().int(),
      estimate: z.number().int(),
    }),
  }),
});

export type TestTrackLoad = z.infer<typeof TestTrackLoadSchema>;

export class TestTrackLane {
  number: number;
  runtimeTarget: number;
  loads: TestTrackLoad[] = [];

  constructor(options: { number: number; runtimeTarget: number }) {
    this.number = options.number;
    this.runtimeTarget = options.runtimeTarget;
  }

  public get runtimeEstimate(): number {
    return this.loads.reduce((sum, load) => sum + load.stats.runtime.estimate, 0);
  }

  public get availableCapacity(): number {
    return this.runtimeTarget - this.runtimeEstimate;
  }

  public get isCongested(): boolean {
    return this.availableCapacity < 0;
  }

  public get status(): TestTrackLaneStatus {
    return this.runtimeTarget > this.runtimeEstimate ? 'open' : 'closed';
  }
}

export class TestTrack {
  runtimeTarget: number;
  lanes: TestTrackLane[] = [];

  constructor(options: { runtimeTarget: number }) {
    this.runtimeTarget = options.runtimeTarget;
  }

  public get laneCount(): number {
    return this.lanes.length;
  }

  public get openLanes(): TestTrackLane[] {
    return this.lanes.filter((lane) => lane.status === 'open');
  }

  public get anyLaneOpen(): boolean {
    return this.openLanes.length > 0;
  }

  public get leastLoadedOpenLane(): TestTrackLane | undefined {
    if (!this.anyLaneOpen) {
      // No open lanes, nothing to return
      return;
    }

    return this.openLanes.reduce((previous, current) =>
      current.runtimeEstimate < previous.runtimeEstimate ? current : previous
    );
  }

  public get leastLoadedLane(): TestTrackLane | undefined {
    if (this.laneCount === 0) {
      // No lanes on this track, nothing to return
      return;
    }

    return this.lanes.reduce((previous, current) =>
      current.runtimeEstimate < previous.runtimeEstimate ? current : previous
    );
  }

  addLane(): TestTrackLane {
    const lane = new TestTrackLane({
      number: this.laneCount + 1,
      runtimeTarget: this.runtimeTarget,
    });
    this.lanes.push(lane);
    return lane;
  }

  addLoadToNewLane(load: TestTrackLoad) {
    const lane = this.addLane();
    lane.loads.push(load);
    return lane;
  }

  addLoadToLeastCongestedLane(load: TestTrackLoad, allowNewLane: boolean) {
    let lane: TestTrackLane | undefined;

    if (this.anyLaneOpen) {
      lane = this.leastLoadedOpenLane as TestTrackLane;

      const predictedRuntime = lane.runtimeEstimate + load.stats.runtime.estimate;

      if (predictedRuntime > lane.runtimeTarget && allowNewLane) {
        lane = this.addLane();
      }
    } else {
      lane = allowNewLane ? this.addLane() : this.leastLoadedLane;
    }

    if (lane === undefined) {
      throw new TestTrackError("Track doesn't have any lanes");
    }

    lane.loads.push(load);
    return lane;
  }

  public get specification(): TestTrackSpec {
    let provisionedRuntime = 0;
    let expectedRuntime = 0;
    let unusedRuntime = 0;
    let longestLaneEstimate = 0;
    let shortestLaneEstimate = 0;
    const lanes: TestTrackSpec['lanes'] = [];

    this.lanes.forEach((lane) => {
      provisionedRuntime += lane.runtimeTarget;
      expectedRuntime += lane.runtimeEstimate;
      unusedRuntime += lane.availableCapacity;

      if (lane.runtimeEstimate > longestLaneEstimate) {
        longestLaneEstimate = lane.runtimeEstimate;
      }

      if (shortestLaneEstimate === 0) {
        shortestLaneEstimate = lane.runtimeEstimate;
      }

      if (lane.runtimeEstimate < shortestLaneEstimate) {
        shortestLaneEstimate = lane.runtimeEstimate;
      }

      lanes.push(
        TestTrackSpecSchema.shape.lanes.element.parse({
          number: lane.number,
          runtimeTarget: lane.runtimeTarget,
          runtimeEstimate: lane.runtimeEstimate,
          availableCapacity: lane.availableCapacity,
          status: lane.status,
          isCongested: lane.isCongested,
          loads: lane.loads.map((load) => load.id),
        })
      );
    });

    const unusedRuntimePercent = (unusedRuntime / provisionedRuntime || 0) * 100;
    let runtimeOverflow = 0;

    if (unusedRuntime < 0) {
      runtimeOverflow = Math.abs(unusedRuntime);
      unusedRuntime = 0;
    }

    return TestTrackSpecSchema.parse({
      stats: {
        lane: {
          count: this.laneCount,
          saturationPercent: parseFloat((100 - unusedRuntimePercent).toFixed(2)),
          longestEstimate: longestLaneEstimate,
          shortestEstimate: shortestLaneEstimate,
        },
        combinedRuntime: {
          target: provisionedRuntime,
          expected: expectedRuntime,
          unused: unusedRuntime,
          overflow: runtimeOverflow,
        },
      },
      lanes,
    });
  }
}
