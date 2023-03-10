/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { IsoDateString } from '@kbn/securitysolution-io-ts-types';

const RRuleRecord = t.intersection([
  t.type({
    dtstart: IsoDateString,
    tzid: t.string,
  }),
  t.partial({
    freq: t.union([
      t.literal(0),
      t.literal(1),
      t.literal(2),
      t.literal(3),
      t.literal(4),
      t.literal(5),
      t.literal(6),
    ]),
    until: t.string,
    count: t.number,
    interval: t.number,
    wkst: t.union([
      t.literal('MO'),
      t.literal('TU'),
      t.literal('WE'),
      t.literal('TH'),
      t.literal('FR'),
      t.literal('SA'),
      t.literal('SU'),
    ]),
    byweekday: t.array(t.union([t.string, t.number])),
    bymonth: t.array(t.number),
    bysetpos: t.array(t.number),
    bymonthday: t.array(t.number),
    byyearday: t.array(t.number),
    byweekno: t.array(t.number),
    byhour: t.array(t.number),
    byminute: t.array(t.number),
    bysecond: t.array(t.number),
  }),
]);

const RuleSnoozeSchedule = t.intersection([
  t.type({
    duration: t.number,
    rRule: RRuleRecord,
  }),
  t.partial({
    id: t.string,
    skipRecurrences: t.array(t.string),
  }),
]);

export type RuleSnoozeInfo = t.TypeOf<typeof RuleSnoozeInfo>;
export const RuleSnoozeInfo = t.intersection([
  t.type({
    mute_all: t.boolean,
  }),
  t.partial({
    snooze_schedule: t.array(RuleSnoozeSchedule),
    active_snoozes: t.array(t.string),
    is_snoozed_until: t.unknown,
  }),
]);
