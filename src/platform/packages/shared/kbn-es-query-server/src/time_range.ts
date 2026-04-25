/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const absoluteTimeRangeMode = schema.literal('absolute');
const relativeTimeRangeMode = schema.literal('relative');

export const timeRangeSchema = schema.object(
  {
    from: schema.string({
      meta: {
        description:
          'The start of the time range. Accepts Elasticsearch [date math](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math) expressions (for example, `now-7d`) or ISO 8601 timestamps.',
      },
    }),
    to: schema.string({
      meta: {
        description:
          'The end of the time range. Accepts Elasticsearch [date math](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math) expressions (for example, `now`) or ISO 8601 timestamps.',
      },
    }),
    mode: schema.maybe(
      schema.oneOf([absoluteTimeRangeMode, relativeTimeRangeMode], {
        meta: {
          description:
            'The time range mode. Use `absolute` for fixed start and end timestamps. Use `relative` for [date math](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math) expressions that are re-evaluated at query time (for example, `now-7d`).',
        },
      })
    ),
  },
  {
    meta: {
      id: 'kbn-es-query-server-timeRangeSchema',
      title: 'Time range',
      description: 'Specifies the time range for a query.',
    },
  }
);

export const absoluteTimeRangeSchema = timeRangeSchema.extends(
  {
    mode: absoluteTimeRangeMode,
  },
  { meta: { id: 'kbn-es-query-server-absoluteTimeRangeSchema' } }
);

export const relativeTimeRangeSchema = timeRangeSchema.extends(
  {
    mode: relativeTimeRangeMode,
  },
  { meta: { id: 'kbn-es-query-server-relativeTimeRangeSchema' } }
);
