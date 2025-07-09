/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Controls group state */
export const CONTROLS_GROUP_TYPE = 'control_group';

export const CONTROLS_LABEL_POSITION_ONE_LINE = 'oneLine';
export const CONTROLS_LABEL_POSITION_TWO_LINE = 'twoLine';

export const CONTROLS_CHAINING_NONE = 'NONE';
export const CONTROLS_CHAINING_HIERARCHICAL = 'HIERARCHICAL';

export const DEFAULT_CONTROLS_CHAINING = CONTROLS_CHAINING_HIERARCHICAL;
export const DEFAULT_CONTROLS_LABEL_POSITION = CONTROLS_LABEL_POSITION_ONE_LINE;
export const DEFAULT_IGNORE_PARENT_SETTINGS = {
  ignoreFilters: false,
  ignoreQuery: false,
  ignoreTimerange: false,
  ignoreValidations: false,
} as const;
export const DEFAULT_AUTO_APPLY_SELECTIONS = true;
