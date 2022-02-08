/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class FlameGraph {
  constructor(events, totalEvents, stackTraces, stackFrames, executables) {
    this.events = events;
    this.totalEvents = totalEvents;
    this.stacktraces = stackTraces;
    this.stackframes = stackFrames;
    this.executables = executables;
  }

  toElastic() {
    let facts = [];
    for (const trace of this.stacktraces) {
      if (trace.found) {
        const pairs = ['root'].concat(trace._source.FrameID).map((item, i) => [i, item]);
        const fact = {
          id: trace._source.FrameID[trace._source.FrameID.length - 1],
          value: 1,
          depth: trace._source.FrameID.length,
          layers: Object.fromEntries(pairs),
        };
        facts.push(fact);
      }
    }
    return { facts };
  }

  toPixi() {
    return {};
  }
}
