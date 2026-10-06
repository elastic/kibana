/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, PhraseFilter, ScriptedPhraseFilter } from '@kbn/es-query';
import type { FILTERS } from '@kbn/es-query';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function getPhraseDisplayValue(
  filter: PhraseFilter | ScriptedPhraseFilter,
  formatter?: FieldFormat,
  fieldType?: string
): string;
export declare const isMapPhraseFilter: (filter: any) => filter is PhraseFilter;
export declare const mapPhrase: (filter: Filter) => {
  key: string;
  params: {
    query: any;
  };
  type: FILTERS;
};
