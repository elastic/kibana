/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { WidgetType } from './types';
import { getMeta } from '../schema_metadata';

export const getDefaultWidgetForSchema = (schema: z.ZodTypeAny) => {
  if (schema instanceof z.ZodString) {
    const metaInfo = getMeta(schema);
    if (metaInfo?.sensitive) {
      return WidgetType.Password;
    }
    return WidgetType.Text;
  } else if (schema instanceof z.ZodDiscriminatedUnion) {
    return WidgetType.FormFieldset;
  } else if (schema instanceof z.ZodObject) {
    return WidgetType.KeyValue;
  }

  return undefined;
};
