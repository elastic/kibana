/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SlotResources } from '../get_slot_resources';

export interface ScheduleConfigInput {
  path: string;
  testDurationMins: number;
}

export interface ScheduleConfigOutput extends ScheduleConfigInput {
  resources: SlotResources;
  tooLong: boolean;
}

export interface ScheduleConfigOptions {
  maxDurationMins: number;
  configs: ScheduleConfigInput[];
  machines: Array<{
    name: string;
    cpus: number;
    memoryMb: number;
  }>;
}

export interface ScheduleConfigTestGroup {
  configs: ScheduleConfigOutput[];
  machine: {
    name: string;
    cpus: number;
    memoryMb: number;
  };
}

export interface ScheduleConfigTestGroupResults {
  groups: ScheduleConfigTestGroup[];
}
