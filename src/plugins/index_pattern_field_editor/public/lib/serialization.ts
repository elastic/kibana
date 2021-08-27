/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IndexPatternField } from '../../../data/common/index_patterns/fields/index_pattern_field';
import { IndexPattern } from '../../../data/common/index_patterns/index_patterns/index_pattern';
import type { Field } from '../types';

export const deserializeField = (
  indexPattern: IndexPattern,
  field?: IndexPatternField
): Field | undefined => {
  if (field === undefined) {
    return undefined;
  }

  return {
    name: field.name,
    type: field?.esTypes ? field.esTypes[0] : 'keyword',
    script: field.runtimeField ? field.runtimeField.script : undefined,
    customLabel: field.customLabel,
    popularity: field.count,
    format: indexPattern.getFormatterForFieldNoDefault(field.name)?.toJSON(),
  };
};
