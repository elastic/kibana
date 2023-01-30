/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { dateType, summarySchema } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { timeWindowSchema } from './time_window';

const occurrencesBudgetingMethodSchema = t.literal('occurrences');
const timeslicesBudgetingMethodSchema = t.literal('timeslices');

const budgetingMethodSchema = t.union([
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
]);

const objectiveSchema = t.intersection([
  t.type({ target: t.number }),
  t.partial({ timesliceTarget: t.number, timesliceWindow: durationType }),
]);

const settingsSchema = t.type({
  timestampField: t.string,
  syncDelay: durationType,
  frequency: durationType,
});

const optionalSettingsSchema = t.partial({ ...settingsSchema.props });

const sloSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  settings: settingsSchema,
  revision: t.number,
  enabled: t.boolean,
  createdAt: dateType,
  updatedAt: dateType,
});

const sloWithSummarySchema = t.intersection([sloSchema, t.type({ summary: summarySchema })]);

export {
  budgetingMethodSchema,
  objectiveSchema,
  occurrencesBudgetingMethodSchema,
  optionalSettingsSchema,
  settingsSchema,
  sloSchema,
  sloWithSummarySchema,
  timeslicesBudgetingMethodSchema,
};
