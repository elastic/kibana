/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { WeekdayStr } from 'rrule';

export enum MaintenanceWindowStatus {
  Running = 'running',
  Upcoming = 'upcoming',
  Finished = 'finished',
  Archived = 'archived',
}

export interface MaintenanceWindowModificationMetadata {
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DateRange {
  gte: string;
  lte: string;
}

export interface MaintenanceWindowSOProperties {
  title: string;
  enabled: boolean;
  duration: number;
  expirationDate: string;
  events: DateRange[];
  rRule: RRuleParams;
}

export type MaintenanceWindowSOAttributes = MaintenanceWindowSOProperties &
  MaintenanceWindowModificationMetadata;

export type MaintenanceWindow = MaintenanceWindowSOAttributes & {
  status: MaintenanceWindowStatus;
  eventStartTime: string | null;
  eventEndTime: string | null;
  id: string;
};

export type RRuleParams = Partial<RRuleRecord> & Pick<RRuleRecord, 'dtstart' | 'tzid'>;

// An iCal RRULE  to define a recurrence schedule, see https://github.com/jakubroztocil/rrule for the spec
export interface RRuleRecord {
  dtstart: string;
  tzid: string;
  freq?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  until?: string;
  count?: number;
  interval?: number;
  wkst?: WeekdayStr;
  byweekday?: Array<string | number>;
  bymonth?: number[];
  bysetpos?: number[];
  bymonthday: number[];
  byyearday: number[];
  byweekno: number[];
  byhour: number[];
  byminute: number[];
  bysecond: number[];
}
