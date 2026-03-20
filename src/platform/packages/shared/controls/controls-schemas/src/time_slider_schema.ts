/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const timeSliderControlSchema = schema.object({
  start_percentage_of_time_range: schema.maybe(schema.number()),
  end_percentage_of_time_range: schema.maybe(schema.number()),
  is_anchored: schema.maybe(schema.boolean()),
});
