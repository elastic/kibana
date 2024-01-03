/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash/fp';
import { ALERT_EVENTS_FIELDS } from './fields';

export const buildAlertFieldsRequest = (fields: string[], excludeEcsData?: boolean) =>
  uniq([
    ...fields.filter((field) => !field.startsWith('_')),
    ...(excludeEcsData ? [] : ALERT_EVENTS_FIELDS),
  ]).map((field) => ({
    field,
    include_unmapped: true,
    ...(field === '@timestamp'
      ? {
          format: 'strict_date_optional_time',
        }
      : {}),
  }));
