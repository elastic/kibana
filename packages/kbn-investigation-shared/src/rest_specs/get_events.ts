/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { eventResponseSchema } from './event';

const getEventsParamsSchema = t.partial({
  query: t.partial({
    rangeFrom: t.string,
    rangeTo: t.string,
    source: t.string,
  }),
});

const getEventsResponseSchema = t.array(eventResponseSchema);

type GetEventsParams = t.TypeOf<typeof getEventsParamsSchema.props.query>;
type GetEventsResponse = t.OutputOf<typeof getEventsResponseSchema>;

export { getEventsParamsSchema, getEventsResponseSchema };
export type { GetEventsParams, GetEventsResponse };
