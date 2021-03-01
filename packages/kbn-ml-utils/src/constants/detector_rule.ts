/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Contains values for ML job detector rules.
 */

export enum ACTION {
  SKIP_MODEL_UPDATE = 'skip_model_update',
  SKIP_RESULT = 'skip_result',
}

export enum FILTER_TYPE {
  EXCLUDE = 'exclude',
  INCLUDE = 'include',
}

export enum APPLIES_TO {
  ACTUAL = 'actual',
  DIFF_FROM_TYPICAL = 'diff_from_typical',
  TYPICAL = 'typical',
}

export enum OPERATOR {
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
}

// List of detector functions which don't support rules with numeric conditions.
export const CONDITIONS_NOT_SUPPORTED_FUNCTIONS = ['freq_rare', 'lat_long', 'metric', 'rare'];
