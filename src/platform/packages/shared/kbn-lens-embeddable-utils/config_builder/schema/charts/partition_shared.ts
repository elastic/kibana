/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const legendTruncateAfterLinesSchema = schema.maybe(
  schema.number({
    defaultValue: 1,
    min: 1,
    max: 10,
    meta: { description: 'Maximum lines before truncating legend items (1-10)' },
  })
);

export const legendVisibleSchema = schema.maybe(
  schema.oneOf([schema.literal('auto'), schema.literal('show'), schema.literal('hide')], {
    meta: { description: 'Legend visibility: auto, show, or hide' },
  })
);

export const legendSizeSchema = schema.maybe(
  schema.oneOf(
    [
      schema.literal('auto'),
      schema.literal('small'),
      schema.literal('medium'),
      schema.literal('large'),
      schema.literal('xlarge'),
    ],
    { meta: { description: 'Legend size: auto, small, medium, large, or xlarge' } }
  )
);

export const valueDisplaySchema = schema.maybe(
  schema.object(
    {
      mode: schema.oneOf(
        [schema.literal('hidden'), schema.literal('absolute'), schema.literal('percentage')],
        { meta: { description: 'Value display mode: hidden, absolute, or percentage' } }
      ),
      percent_decimals: schema.maybe(
        schema.number({
          defaultValue: 2,
          min: 0,
          max: 10,
          meta: { description: 'Decimal places for percentage display (0-10)' },
        })
      ),
    },
    { meta: { description: 'Configuration for displaying values in chart cells' } }
  )
);

export const legendNestedSchema = schema.maybe(
  schema.boolean({
    defaultValue: false,
    meta: { description: 'Show nested legend with hierarchical breakdown levels' },
  })
);
