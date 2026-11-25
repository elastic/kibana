/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FILES_PER_HOUR, HOUR_MS } from './constants';
import type { ProfileSummary } from './profile_summary';
import type { AdmissionOutcome } from './types';

/**
 * The code a capture blocked in: the top Kibana frame's location, else the top frame's location or
 * name. Frames without a script, such as `(garbage collector)`, have no location.
 */
export const profileSignature = ({ topKibanaFrame, frames }: ProfileSummary): string => {
  if (topKibanaFrame?.location) {
    return topKibanaFrame.location;
  }
  const [topFrame] = frames;
  if (!topFrame) {
    return '(unknown)';
  }
  return topFrame.location ?? topFrame.name;
};

/**
 * Admits up to `FILES_PER_HOUR` profile files per clock hour, one per signature. A failed write
 * still uses its slot. The signatures clear when a later hour starts; a clock set back keeps them.
 */
export class WriteAdmission {
  private hour = -1;
  private readonly written = new Set<string>();

  /** `nowMs` is wall-clock time so that hours match the log timestamps. */
  public admit(signature: string, nowMs: number): AdmissionOutcome {
    const hour = Math.floor(nowMs / HOUR_MS);
    if (hour > this.hour) {
      this.hour = hour;
      this.written.clear();
    }
    if (this.written.has(signature)) {
      return 'same_frame';
    }
    if (this.written.size >= FILES_PER_HOUR) {
      return 'hour_limit';
    }
    this.written.add(signature);
    return 'admitted';
  }
}
