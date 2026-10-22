/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatSchema, type AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';

export const expectValidFormat = (value: AsCodeDataViewSpec['field_settings']): void => {
  Object.values(value ?? {}).forEach((field) => {
    if ('format' in field && field.format) {
      expect(() => formatSchema.parse(field.format)).not.toThrow();
    }
  });
};
