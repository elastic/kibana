/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import type { DataSourceProfileProvider } from '../../../..';

// Field names that should always be surfaced in the UI for logs data.
const RECOMMENDED_FIELD_NAMES: Array<DataViewField['name']> = [
  'event.dataset',
  'service.name',
  'host.name',
  'message',
  'log.level',
];

export const getRecommendedFields: DataSourceProfileProvider['profile']['getRecommendedFields'] =
  (prev) => (fields) => ({
    ...(prev ? prev(fields) : {}),

    recommendedFields:
      fields && fields.length
        ? fields.filter((field) => RECOMMENDED_FIELD_NAMES.includes(field.name))
        : RECOMMENDED_FIELD_NAMES.map(
            (name) =>
              new DataViewField({
                name,
                type: 'string',
                searchable: true,
                aggregatable: true,
              })
          ),
  });
