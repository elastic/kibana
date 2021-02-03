/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectReference } from '../../../../core/types';

export interface ObjectField {
  type: FieldType;
  name: string;
  value: any;
}

export type FieldType = 'text' | 'number' | 'boolean' | 'array' | 'json';

export interface FieldState {
  value?: any;
  invalid?: boolean;
}

export interface SubmittedFormData {
  attributes: any;
  references: SavedObjectReference[];
}
