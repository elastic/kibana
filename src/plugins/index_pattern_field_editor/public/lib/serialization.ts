/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { IndexPatternField, IndexPattern } from '../shared_imports';
import { Field } from '../types';

export const deserializeField = (
  indexPattern: IndexPattern,
  field?: IndexPatternField
): Field | undefined => {
  if (field === undefined) {
    return field;
  }

  return {
    name: field.name,
    type: field.type,
    script: field.runtimeField ? field.runtimeField.script : undefined,
    customLabel: field.customLabel,
    popularity: field.count,
    format: indexPattern.getFormatterForFieldNoDefault(field.name)?.toJSON(),
  };
};
