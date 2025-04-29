/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { first, last } from 'lodash';
import moment from 'moment';

interface TimerangeProgressOptions {
  log: ToolingLog;
  total: number;
  reportEvery: number;
}

export class TimerangeProgressReporter {
  private readonly startOfRun: number = performance.now();

  private measurements: Array<{
    measuredAt: number;
    index: number;
  }> = [
    {
      measuredAt: this.startOfRun,
      index: 0,
    },
  ];

  private lastReported: number = this.startOfRun;

  constructor(private readonly options: TimerangeProgressOptions) {}

  next(index: number) {
    const now = performance.now();

    this.measurements.unshift({
      index,
      measuredAt: now,
    });

    this.measurements.length = Math.min(10, this.measurements.length);

    const timeSinceLastReported = now - this.lastReported;

    if (timeSinceLastReported >= this.options.reportEvery) {
      this.report(now);
    }
  }

  private report(now: number) {
    this.lastReported = now;

    const firstMeasurement = first(this.measurements)!;
    const lastMeasurement = last(this.measurements)!;

    const totalDurationFormatted = moment.duration(now - this.startOfRun).humanize();

    const indicesLeft = this.options.total - lastMeasurement.index;

    const measuredIndicesProcessed = lastMeasurement.index - firstMeasurement.index;

    const measuredDuration = lastMeasurement.measuredAt - firstMeasurement.measuredAt;

    const indicesPerMs = measuredIndicesProcessed / measuredDuration;

    const timeLeft = indicesLeft / indicesPerMs;

    const timeLeftFormatted = moment.duration(timeLeft).humanize(true);

    const totalProgress = lastMeasurement.index / this.options.total;

    this.options.log.info(
      `progress=${(totalProgress * 100).toPrecision(
        3
      )}%, duration=${totalDurationFormatted}, eta=${timeLeftFormatted}`
    );
  }
}
