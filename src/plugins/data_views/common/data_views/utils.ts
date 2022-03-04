/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RuntimeField, RuntimeFieldSpec, RuntimeTypeExceptComposite } from '../types';

export const removeFieldAttrs = (runtimeField: RuntimeField): RuntimeFieldSpec => {
  const { type, script, fields } = runtimeField;
  const fieldsTypeOnly = fields && {
    fields: Object.entries(fields).reduce((col, [fieldName, field]) => {
      col[fieldName] = { type: field.type };
      return col;
    }, {} as Record<string, { type: RuntimeTypeExceptComposite }>),
  };

  return {
    type,
    script,
    ...fieldsTypeOnly,
  };
};
