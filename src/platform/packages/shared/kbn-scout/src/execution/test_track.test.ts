/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestTrack, TestTrackLoad } from './test_track';

describe('TestTrack', () => {
  it('should not create lanes when the track is created', () => {
    const track = new TestTrack({ runtimeTarget: 10 });
    expect(track.laneCount).toBe(0);
    expect(track.anyLaneOpen).toBe(false);
    expect(track.leastLoadedLane).toBe(undefined);
    expect(track.leastLoadedOpenLane).toBe(undefined);
  });

  it('closes the lane when one load fills it entirely', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const load: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 10,
          pc99th: 0,
          max: 0,
          estimate: 10,
        },
      },
    };

    const lane = track.addLoadToLeastCongestedLane(load, true);
    expect(lane.number).toBe(1);
    expect(lane.runtimeTarget).toBe(10);
    expect(lane.runtimeEstimate).toBe(10);
    expect(lane.loads.length).toBe(1);
    expect(lane.loads[0]).toBe(load);
    expect(lane.isCongested).toBe(false);
    expect(lane.status).toBe('closed');

    expect(track.laneCount).toBe(1);
    expect(track.anyLaneOpen).toBe(false);
    expect(track.leastLoadedLane).toBe(lane);
    expect(track.leastLoadedOpenLane).toBe(undefined);
  });

  it('keeps the lane open when a load only partially fills it', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const load: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 3,
          pc99th: 0,
          max: 0,
          estimate: 3,
        },
      },
    };

    const lane = track.addLoadToLeastCongestedLane(load, true);
    expect(lane.number).toBe(1);
    expect(lane.runtimeTarget).toBe(10);
    expect(lane.runtimeEstimate).toBe(3);
    expect(lane.loads.length).toBe(1);
    expect(lane.loads[0]).toBe(load);
    expect(lane.isCongested).toBe(false);
    expect(lane.status).toBe('open');

    expect(track.laneCount).toBe(1);
    expect(track.anyLaneOpen).toBe(true);
    expect(track.leastLoadedLane).toBe(lane);
    expect(track.leastLoadedOpenLane).toBe(lane);
  });

  it('keeps a lane open when multiple loads partially fill it', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 3,
          pc99th: 0,
          max: 0,
          estimate: 3,
        },
      },
    };

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 5,
          pc99th: 0,
          max: 0,
          estimate: 5,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadA, true);
    const lane = track.addLoadToLeastCongestedLane(loadB, true);

    expect(lane.number).toBe(1);
    expect(lane.runtimeTarget).toBe(10);
    expect(lane.runtimeEstimate).toBe(8);
    expect(lane.loads.length).toBe(2);
    expect(lane.loads[0]).toBe(loadA);
    expect(lane.loads[1]).toBe(loadB);
    expect(lane.isCongested).toBe(false);
    expect(lane.status).toBe('open');

    expect(track.laneCount).toBe(1);
    expect(track.anyLaneOpen).toBe(true);
    expect(track.leastLoadedLane).toBe(lane);
    expect(track.leastLoadedOpenLane).toBe(lane);
  });

  it('closes the lane when multiple loads completely fill it', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 9,
          pc99th: 0,
          max: 0,
          estimate: 9,
        },
      },
    };

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 1,
          pc99th: 0,
          max: 0,
          estimate: 1,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadA, true);
    const lane = track.addLoadToLeastCongestedLane(loadB, true);

    expect(lane.number).toBe(1);
    expect(lane.runtimeTarget).toBe(10);
    expect(lane.runtimeEstimate).toBe(10);
    expect(lane.loads.length).toBe(2);
    expect(lane.loads[0]).toBe(loadA);
    expect(lane.loads[1]).toBe(loadB);
    expect(lane.isCongested).toBe(false);
    expect(lane.status).toBe('closed');

    expect(track.laneCount).toBe(1);
    expect(track.anyLaneOpen).toBe(false);
    expect(track.leastLoadedLane).toBe(lane);
    expect(track.leastLoadedOpenLane).toBe(undefined);
  });

  it('creates a new lane if a load exceeds capacity and allowNewLane is true', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 10,
          pc99th: 0,
          max: 0,
          estimate: 10,
        },
      },
    };

    const laneAfterAddingLoadA = track.addLoadToLeastCongestedLane(loadA, true);

    // add a load of 10 to a lane with capacity 10
    expect(laneAfterAddingLoadA.number).toBe(1);
    expect(laneAfterAddingLoadA.runtimeTarget).toBe(10);
    expect(laneAfterAddingLoadA.runtimeEstimate).toBe(10);
    expect(laneAfterAddingLoadA.loads.length).toBe(1);
    expect(laneAfterAddingLoadA.loads[0]).toBe(loadA);
    expect(laneAfterAddingLoadA.isCongested).toBe(false);
    expect(laneAfterAddingLoadA.status).toBe('closed');

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 1,
          pc99th: 0,
          max: 0,
          estimate: 1,
        },
      },
    };

    // we expect a new lane to be created to accommodate the second load
    const allowNewLane = true;
    const newLane = track.addLoadToLeastCongestedLane(loadB, allowNewLane);
    expect(newLane.number).toBe(2);
    expect(newLane.runtimeTarget).toBe(10);
    expect(newLane.runtimeEstimate).toBe(1);
    expect(newLane.loads.length).toBe(1);
    expect(newLane.loads[0]).toBe(loadB);
    expect(newLane.isCongested).toBe(false);
    expect(newLane.status).toBe('open');

    expect(track.laneCount).toBe(2);
    expect(track.anyLaneOpen).toBe(true);
    expect(track.leastLoadedLane).toBe(newLane);
    expect(track.leastLoadedOpenLane).toBe(newLane);
  });

  it('does not create a new lane if a load exceeds capacity and allowNewLane is false', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 10,
          pc99th: 0,
          max: 0,
          estimate: 10,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadA, true);

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 1,
          pc99th: 0,
          max: 0,
          estimate: 1,
        },
      },
    };

    // we expect the load to be mounted on the original lane, even though it exceeds capacity
    const allowNewLane = false;
    const lane = track.addLoadToLeastCongestedLane(loadB, allowNewLane);
    expect(lane.number).toBe(1);
    expect(lane.runtimeTarget).toBe(10);
    expect(lane.runtimeEstimate).toBe(11);
    expect(lane.loads.length).toBe(2);
    expect(lane.loads[0]).toBe(loadA);
    expect(lane.loads[1]).toBe(loadB);

    // we expect the lane to be congested and closed
    expect(lane.isCongested).toBe(true);
    expect(lane.status).toBe('closed');

    expect(track.laneCount).toBe(1);
    expect(track.anyLaneOpen).toBe(false);
    expect(track.leastLoadedLane).toBe(lane);
    expect(track.leastLoadedOpenLane).toBe(undefined);
  });

  it('adds the load to the least loaded lane when multiple lanes are open', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 7,
          pc99th: 0,
          max: 0,
          estimate: 7,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadA, true);

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 8,
          pc99th: 0,
          max: 0,
          estimate: 8,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadB, true);

    // by now, there should be two lanes
    expect(track.laneCount).toBe(2);

    // adding a third load will add the load to the least loaded lane: the first lane
    const loadC: TestTrackLoad = {
      id: 'configPathC',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 1,
          pc99th: 0,
          max: 0,
          estimate: 1,
        },
      },
    };

    // disable creating a new lane
    const lane = track.addLoadToLeastCongestedLane(loadC, false);

    // the load was added to the first lane
    expect(lane.number).toBe(1);
    expect(lane.runtimeTarget).toBe(10);
    expect(lane.runtimeEstimate).toBe(8);
  });

  it('adds load to a new lane with addLoadToNewLane', () => {
    // fix it
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 7,
          pc99th: 0,
          max: 0,
          estimate: 7,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadA, true);

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 8,
          pc99th: 0,
          max: 0,
          estimate: 8,
        },
      },
    };

    track.addLoadToNewLane(loadB);

    // by now, there should be two lanes
    expect(track.laneCount).toBe(2);
  });

  it('should throw an error if no lanes are available and allowNewLane is false', () => {
    const track = new TestTrack({ runtimeTarget: 10 });
    expect(track.laneCount).toBe(0);

    const load: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 7,
          pc99th: 0,
          max: 0,
          estimate: 7,
        },
      },
    };

    expect(() => track.addLoadToLeastCongestedLane(load, false)).toThrowError(
      "Track doesn't have any lanes"
    );
  });

  it('returns the test track specification', () => {
    const track = new TestTrack({ runtimeTarget: 10 });

    const loadA: TestTrackLoad = {
      id: 'configPathA',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 7,
          pc99th: 0,
          max: 0,
          estimate: 7,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadA, true);

    const loadB: TestTrackLoad = {
      id: 'configPathB',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 8,
          pc99th: 0,
          max: 0,
          estimate: 8,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadB, true);

    // adding a third load will add the load to the least loaded lane: the first lane
    const loadC: TestTrackLoad = {
      id: 'configPathC',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 2,
          pc99th: 0,
          max: 0,
          estimate: 2,
        },
      },
    };

    // disable creating a new lane
    track.addLoadToLeastCongestedLane(loadC, false);

    const loadD: TestTrackLoad = {
      id: 'configPathD',
      stats: {
        runCount: 0,
        runtime: {
          avg: 0,
          median: 0,
          pc95th: 5,
          pc99th: 0,
          max: 0,
          estimate: 5,
        },
      },
    };

    track.addLoadToLeastCongestedLane(loadD, false);

    expect(track.specification).toEqual({
      lanes: [
        {
          availableCapacity: 1,
          isCongested: false,
          loads: ['configPathA', 'configPathC'],
          number: 1,
          runtimeEstimate: 9,
          runtimeTarget: 10,
          status: 'open',
        },
        {
          availableCapacity: -3,
          isCongested: true,
          loads: ['configPathB', 'configPathD'],
          number: 2,
          runtimeEstimate: 13,
          runtimeTarget: 10,
          status: 'closed',
        },
      ],
      stats: {
        combinedRuntime: {
          expected: 22,
          overflow: 2,
          target: 20,
          unused: 0,
        },
        lane: {
          count: 2,
          longestEstimate: 13,
          saturationPercent: 110,
          shortestEstimate: 9,
        },
      },
    });
  });
});
