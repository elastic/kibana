/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { durationType } from './duration';

const rollingTimeWindowTypeSchema = t.literal('rolling');
const rollingTimeWindowSchema = t.type({
  duration: durationType,
  type: rollingTimeWindowTypeSchema,
});

const calendarAlignedTimeWindowTypeSchema = t.literal('calendarAligned');
const calendarAlignedTimeWindowSchema = t.type({
  duration: durationType,
  type: calendarAlignedTimeWindowTypeSchema,
});

const timeWindowSchema = t.union([rollingTimeWindowSchema, calendarAlignedTimeWindowSchema]);

export {
  rollingTimeWindowSchema,
  rollingTimeWindowTypeSchema,
  calendarAlignedTimeWindowSchema,
  calendarAlignedTimeWindowTypeSchema,
  timeWindowSchema,
};
