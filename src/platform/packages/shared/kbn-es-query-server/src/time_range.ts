/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const absoluteTimeRangeMode = z.literal('absolute');
const relativeTimeRangeMode = z.literal('relative');

export const timeRangeSchema = z
  .object({
    from: z.string().meta({
      description:
        'The start of the time range. Accepts Elasticsearch [date math](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math) expressions (for example, `now-7d`) or ISO 8601 timestamps.',
    }),
    to: z.string().meta({
      description:
        'The end of the time range. Accepts Elasticsearch [date math](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math) expressions (for example, `now`) or ISO 8601 timestamps.',
    }),
    mode: z
      .union([absoluteTimeRangeMode, relativeTimeRangeMode])
      .meta({
        description:
          'The time range mode. Use `absolute` for fixed start and end timestamps. Use `relative` for [date math](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math) expressions that are re-evaluated at query time (for example, `now-7d`).',
      })
      .optional(),
  })
  .meta({
    id: 'kbn-es-query-server-timeRangeSchema',
    title: 'Time range',
    description: 'Specifies the time range for a query.',
  });

export const absoluteTimeRangeSchema = timeRangeSchema
  .extend({
    mode: absoluteTimeRangeMode,
  })
  .meta({ id: 'kbn-es-query-server-absoluteTimeRangeSchema' });

export const relativeTimeRangeSchema = timeRangeSchema
  .extend({
    mode: relativeTimeRangeMode,
  })
  .meta({ id: 'kbn-es-query-server-relativeTimeRangeSchema' });
