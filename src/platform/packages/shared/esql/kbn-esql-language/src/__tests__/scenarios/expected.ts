/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlFieldType } from '@kbn/esql-types';
import {
  arithmeticOperators,
  comparisonFunctions,
  inOperators,
  logicalOperators,
  matchOperators,
  nullCheckOperators,
  patternMatchOperators,
} from '../../commands/definitions/all_operators';
import type {
  FunctionDefinition,
  FunctionParameterType,
  FunctionReturnType,
} from '../../commands/definitions/types';
import { timeUnitsToSuggest } from '../../commands/definitions/constants';
import { getDateLiterals, getSafeInsertText } from '../../commands/definitions/utils';
import type { Location } from '../../commands/registry/types';
import {
  DATE_DIFF_TIME_UNITS,
  getFieldNamesByType,
  getFunctionSignaturesByReturnType,
  getOperatorSuggestions,
} from '../commands/autocomplete';

type ColumnType = EsqlFieldType | 'any';
type ReturnType = FunctionReturnType | 'any';

const OPERATOR_GROUPS = {
  arithmetic: arithmeticOperators,
  comparison: comparisonFunctions,
  in: inOperators,
  logical: logicalOperators,
  match: matchOperators,
  nullCheck: nullCheckOperators,
  patternMatch: patternMatchOperators,
} as const satisfies Record<string, FunctionDefinition[]>;

export type OperatorGroup = keyof typeof OPERATOR_GROUPS;

interface ExpectedFunctions {
  /** Where the functions are available, as the function definitions name it. */
  readonly availableIn: `${Location}`;
  readonly returning?: ReturnType | readonly ReturnType[];
  readonly scalar?: boolean;
  readonly aggregation?: boolean;
  readonly timeseriesAggregation?: boolean;
  readonly grouping?: boolean;
  /** Includes the operators. */
  readonly operators?: boolean;
  /** Leaves the assignment operators out of the operators. */
  readonly withoutAssignment?: boolean;
  /** Keeps the functions and operators that accept these types as their first parameters. */
  readonly accepting?: readonly FunctionParameterType[];
  /** Function and operator names to leave out. */
  readonly except?: readonly string[];
}

interface ExpectedColumns {
  readonly types?: ColumnType | readonly ColumnType[];
  /** The position inserts a space after the column, so the next suggestions open. */
  readonly followedBySpace?: boolean;
}

/** The texts of the default world's columns, escaped as the editor inserts them. */
export const columns = ({
  types = 'any',
  followedBySpace = false,
}: ExpectedColumns = {}): string[] =>
  getFieldNamesByType(typeof types === 'string' ? types : [...types]).map(
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
  operators: withOperators,
  withoutAssignment,
  accepting,
  except,
}: ExpectedFunctions): string[] =>
  getFunctionSignaturesByReturnType(
    availableIn as Location,
    typeof returning === 'string' ? returning : [...returning],
    {
      scalar,
      agg: aggregation,
      timeseriesAgg: timeseriesAggregation,
      grouping,
      operators: withOperators,
      skipAssign: withoutAssignment,
    },
    accepting,
    except ? [...except] : undefined
  );

/** The texts of the operators in the given groups. */
export const operators = (...groups: OperatorGroup[]): string[] =>
  getOperatorSuggestions(groups.flatMap((group) => OPERATOR_GROUPS[group]));

/** The texts of the date literals. */
export const dateLiterals = (): string[] => getDateLiterals().map(({ text }) => text);

/** The time units DATE_DIFF accepts as its first argument, as inserted. */
export const dateDiffUnits = (): string[] => [...DATE_DIFF_TIME_UNITS];

/** The names of the time units suggested after a number. */
export const timeUnits = (): string[] => timeUnitsToSuggest.map(({ name }) => name);
