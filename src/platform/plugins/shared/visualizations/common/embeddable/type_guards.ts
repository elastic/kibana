/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import isPlainObject from 'lodash/isPlainObject';
import type { VisualizeByReferenceState, VisualizeByValueState } from './types';

export const isVisualizeByReferenceState = (
  value: unknown
): value is VisualizeByReferenceState & { savedObjectId: string } => {
  return Boolean(
    isPlainObject(value) && typeof (value as VisualizeByReferenceState).savedObjectId === 'string'
  );
};

export const isVisualizeByValueState = (value: unknown): value is VisualizeByValueState => {
  return Boolean(isPlainObject(value) && isPlainObject((value as VisualizeByValueState).savedVis));
};
