/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodDiscriminatedUnion, ZodObject } from '@kbn/zod/v4';
import { addMeta } from '../connector_spec_ui';
import type { ConnectorZodSchema } from './deserialize_connector_spec';

const NO_AUTH_TYPE_ID = 'none';

/** Hides auth type none from the form's auth picker, for forms where the Run actions switch sets it. */
export const hideNoAuthInPicker = (schema: ConnectorZodSchema): void => {
  const { secrets } = schema.shape;
  if (!(secrets instanceof ZodDiscriminatedUnion)) {
    return;
  }
  const { discriminator } = secrets.def;
  for (const option of secrets.options) {
    if (!(option instanceof ZodObject)) {
      continue;
    }
    const authTypeField = option.shape[discriminator];
    if (authTypeField instanceof z.ZodLiteral && authTypeField.value === NO_AUTH_TYPE_ID) {
      addMeta(option, { hideInPicker: true });
    }
  }
};
