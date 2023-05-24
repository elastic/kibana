/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { dateType } from './common';
import { budgetingMethodSchema, sloIdSchema, tagsSchema, targetSchema } from './slo';
import { rollingTimeWindowSchema } from './time_window';

const combinedSloSchema = t.type({
  id: sloIdSchema,
  revision: t.number,
  weight: t.number,
});

const compositeSloIdSchema = t.string;

const compositeSloSchema = t.type({
  id: compositeSloIdSchema,
  name: t.string,
  timeWindow: rollingTimeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: targetSchema,
  combinedSlos: t.array(combinedSloSchema),
  tags: tagsSchema,
  createdAt: dateType,
  updatedAt: dateType,
});

export { combinedSloSchema, compositeSloIdSchema, compositeSloSchema };
