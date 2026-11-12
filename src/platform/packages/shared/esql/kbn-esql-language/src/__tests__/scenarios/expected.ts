/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlFieldType } from '@kbn/esql-types';
import type { FunctionDefinition, FunctionReturnType } from '../../commands/definitions/types';
import { getSafeInsertText } from '../../commands/definitions/utils';
import type { Location } from '../../commands/registry/types';
import {
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  getOperatorSuggestions,
} from '../commands/autocomplete';

type ColumnType = EsqlFieldType | 'any';
type ReturnType = FunctionReturnType | 'any';

interface ExpectedFunctions {
  /** Where the functions are available, as the function definitions name it. */
  readonly availableIn: `${Location}`;
  readonly returning?: ReturnType | ReturnType[];
  readonly scalar?: boolean;
  readonly aggregation?: boolean;
  readonly timeseriesAggregation?: boolean;
  readonly grouping?: boolean;
}

interface ExpectedColumns {
  readonly types?: ColumnType | ColumnType[];
  /** The position inserts a space after the column, so the next suggestions open. */
  readonly followedBySpace?: boolean;
}

/** The texts of the default world's columns, escaped as the editor inserts them. */
export const columns = ({
  types = 'any',
  followedBySpace = false,
}: ExpectedColumns = {}): string[] =>
  getFieldNamesByType(types).map(
    (name) => `${getSafeInsertText(name)}${followedBySpace ? ' ' : ''}`
  );

/** The texts of the functions available at a position. */
export const functions = ({
  availableIn,
  returning = 'any',
  scalar,
  aggregation,
  timeseriesAggregation,
  grouping,
}: ExpectedFunctions): string[] =>
  getFunctionSignaturesByReturnType(availableIn as Location, returning, {
    scalar,
    agg: aggregation,
    timeseriesAgg: timeseriesAggregation,
    grouping,
  });

/** The texts of the given operators. */
export const operators = (...groups: FunctionDefinition[][]): string[] =>
  getOperatorSuggestions(groups.flat());
