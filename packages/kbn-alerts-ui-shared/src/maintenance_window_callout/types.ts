/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { WeekdayStr, Options } from '@kbn/rrule';
import { CoreStart } from '@kbn/core/public';

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
  categoryIds?: string[];
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
export type RRuleRecord = Omit<Options, 'dtstart' | 'byweekday' | 'wkst' | 'until'> & {
  dtstart: string;
  byweekday?: Array<WeekdayStr | string | number>;
  wkst?: WeekdayStr;
  until?: string;
};

export interface KibanaServices {
  application: {
    capabilities: Record<string, any>;
  };
  http: Pick<CoreStart['http'], 'fetch'>;
  notifications: Pick<CoreStart['notifications'], 'toasts'>;
}
