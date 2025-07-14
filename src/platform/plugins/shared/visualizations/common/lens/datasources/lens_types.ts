/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface FormBasedLayer {
  columnOrder: string[];
  columns: Record<string, GenericIndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
  linkToLayers?: string[];
  // Partial columns represent the temporary invalid states
  incompleteColumns?: Record<string, IncompleteColumn | undefined>;
  sampling?: number;
  ignoreGlobalFilters?: boolean;
}

export interface FormBasedPersistedState {
  layers: Record<string, Omit<FormBasedLayer, 'indexPatternId'>>;
}

export type PersistedIndexPatternLayer = Omit<FormBasedLayer, 'indexPatternId'>;

export interface FormBasedPrivateState {
  currentIndexPatternId: string;
  layers: Record<string, FormBasedLayer>;
}
