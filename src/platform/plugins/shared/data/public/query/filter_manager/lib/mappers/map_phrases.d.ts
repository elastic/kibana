/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, PhrasesFilter } from '@kbn/es-query';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function getPhrasesDisplayValue(
  filter: PhrasesFilter,
  formatter?: FieldFormat
): string;
export declare const mapPhrases: (filter: Filter) => {
  type: string | undefined;
  key: string | undefined;
  value: (import('@kbn/es-query/src/filters/build_filters').FilterMetaParams | undefined) &
    import('@kbn/es-query/src/filters/build_filters').PhraseFilterValue[];
  params: (import('@kbn/es-query/src/filters/build_filters').FilterMetaParams | undefined) &
    import('@kbn/es-query/src/filters/build_filters').PhraseFilterValue[];
};
