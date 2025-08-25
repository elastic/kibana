/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AvgIndexPatternColumn,
  CardinalityIndexPatternColumn,
  CountIndexPatternColumn,
  CounterRateIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  DerivativeIndexPatternColumn,
  FormulaIndexPatternColumn,
  LastValueIndexPatternColumn,
  MaxIndexPatternColumn,
  MedianIndexPatternColumn,
  MinIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  StandardDeviationIndexPatternColumn,
  StaticValueIndexPatternColumn,
  SumIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { v4 as uuid } from 'uuid';

import { fromCountAPItoLensState, fromCountLensStateToAPI } from './count';
import {
  LensApiAllMetricOperations,
  LensApiCountMetricOperation,
  LensApiCounterRateOperation,
  LensApiCumulativeSumOperation,
  LensApiDifferencesOperation,
  LensApiFormulaOperation,
  LensApiLastValueOperation,
  LensApiMetricOperation,
  LensApiMovingAverageOperation,
  LensApiPercentileOperation,
  LensApiPercentileRanksOperation,
  LensApiReferableMetricOperations,
  LensApiStaticValueOperation,
  LensApiSumMetricOperation,
  LensApiUniqueCountMetricOperation,
} from '../../schema/metric_ops';
import { fromUniqueCountAPItoLensState, fromUniqueCountLensStateToAPI } from './unique_count';
import {
  fromBasicMetricAPItoLensState,
  fromBasicMetricLensStateToAPI,
  fromSumMetricAPIToLensState,
  fromSumMetricLensStateToAPI,
} from './max_min_avg_sum';
import { fromStaticValueAPItoLensState, fromStaticValueLensStateToAPI } from './static_value';
import { fromLastValueAPItoLensState, fromLastValueLensStateToAPI } from './last_value';
import { fromFormulaAPItoLensState, fromFormulaLensStateToAPI } from './formula';
import { fromPercentileAPItoLensState, fromPercentileLensStateToAPI } from './percentile';
import {
  fromPercentileRankLensStateToAPI,
  fromPercentileRanksAPItoLensState,
} from './percentile_ranks';
import { fromDifferencesAPItoLensState, fromDifferencesLensStateToAPI } from './differences';
import { fromCumulativeSumAPItoLensState, fromCumulativeSumLensStateToAPI } from './cumulative_sum';
import { fromCounterRateAPItoLensState, fromCounterRateLensStateToAPI } from './counter_rate';
import { fromMovingAverageAPItoLensState, fromMovingAverageLensStateToAPI } from './moving_average';
import { AnyMetricLensStateColumn, ReferableMetricLensStateColumn } from './types';
import { isAPIColumnOfType, isApiColumnOfReferableType, isLensStateColumnOfType } from './utils';

/**
 * Specialized function signatures for transforming metric API operations to Lens state columns
 */
export function fromMetricAPItoLensState(
  options: LensApiCountMetricOperation
): [CountIndexPatternColumn];
export function fromMetricAPItoLensState(
  options: LensApiUniqueCountMetricOperation
): [CardinalityIndexPatternColumn];
export function fromMetricAPItoLensState(
  options: LensApiMetricOperation
): [
  | StandardDeviationIndexPatternColumn
  | MinIndexPatternColumn
  | MaxIndexPatternColumn
  | AvgIndexPatternColumn
  | MedianIndexPatternColumn
];
export function fromMetricAPItoLensState(
  options: LensApiSumMetricOperation
): [SumIndexPatternColumn];
export function fromMetricAPItoLensState(
  options: LensApiStaticValueOperation
): [StaticValueIndexPatternColumn];
export function fromMetricAPItoLensState(
  options: LensApiFormulaOperation
): [FormulaIndexPatternColumn];
export function fromMetricAPItoLensState(
  options: LensApiLastValueOperation
): [LastValueIndexPatternColumn];
export function fromMetricAPItoLensState(
  options: LensApiMovingAverageOperation
): [MovingAverageIndexPatternColumn, ReferableMetricLensStateColumn];
export function fromMetricAPItoLensState(
  options: LensApiCounterRateOperation
): [CounterRateIndexPatternColumn, ReferableMetricLensStateColumn];
export function fromMetricAPItoLensState(
  options: LensApiCumulativeSumOperation
): [CumulativeSumIndexPatternColumn, ReferableMetricLensStateColumn];
export function fromMetricAPItoLensState(
  options: LensApiDifferencesOperation
): [DerivativeIndexPatternColumn, ReferableMetricLensStateColumn];
export function fromMetricAPItoLensState(
  options: LensApiAllMetricOperations
): AnyMetricLensStateColumn[] {
  if (isAPIColumnOfType<LensApiCountMetricOperation>('count', options)) {
    return [fromCountAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiUniqueCountMetricOperation>('unique_count', options)) {
    return [fromUniqueCountAPItoLensState(options)];
  }
  if (
    isAPIColumnOfType<LensApiMetricOperation>('average', options) ||
    isAPIColumnOfType<LensApiMetricOperation>('median', options) ||
    isAPIColumnOfType<LensApiMetricOperation>('min', options) ||
    isAPIColumnOfType<LensApiMetricOperation>('max', options) ||
    isAPIColumnOfType<LensApiMetricOperation>('standard_deviation', options)
  ) {
    return [fromBasicMetricAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiSumMetricOperation>('sum', options)) {
    return [fromSumMetricAPIToLensState(options)];
  }
  if (isAPIColumnOfType<LensApiStaticValueOperation>('static_value', options)) {
    return [fromStaticValueAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiFormulaOperation>('formula', options)) {
    return [fromFormulaAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiLastValueOperation>('last_value', options)) {
    return [fromLastValueAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiPercentileOperation>('percentile', options)) {
    return [fromPercentileAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiPercentileRanksOperation>('percentile_rank', options)) {
    return [fromPercentileRanksAPItoLensState(options)];
  }
  if (isAPIColumnOfType<LensApiMovingAverageOperation>('moving_average', options)) {
    if (isApiColumnOfReferableType(options.of)) {
      // @ts-expect-error
      const [refColumn] = fromMetricAPItoLensState(options.of) as ReferableMetricLensStateColumn[];
      return [
        fromMovingAverageAPItoLensState(options, {
          id: uuid(),
          field: options.of.field,
          label: options.of.label,
        }),
        refColumn,
      ];
    }
  }
  if (isAPIColumnOfType<LensApiCounterRateOperation>('counter_rate', options)) {
    const [refColumn] = fromMetricAPItoLensState({ operation: 'max', field: options.field });
    if (!refColumn || !('sourceField' in refColumn)) {
      return [];
    }
    return [
      fromCounterRateAPItoLensState(options, { id: uuid(), field: refColumn.sourceField }),
      refColumn,
    ];
  }
  if (isAPIColumnOfType<LensApiCumulativeSumOperation>('cumulative_sum', options)) {
    const [refColumn] = fromMetricAPItoLensState({ operation: 'sum', field: options.field });
    if (!refColumn || !('sourceField' in refColumn)) {
      return [];
    }
    return [
      fromCumulativeSumAPItoLensState(options, {
        id: uuid(),
        field: refColumn.sourceField,
      }),
      refColumn,
    ];
  }
  if (isAPIColumnOfType<LensApiDifferencesOperation>('differences', options)) {
    if (isApiColumnOfReferableType(options.of)) {
      // @ts-expect-error
      const [refColumn] = fromMetricAPItoLensState(options.of) as ReferableMetricLensStateColumn[];
      return [
        fromDifferencesAPItoLensState(options, {
          id: uuid(),
          field: refColumn.sourceField,
          label: refColumn.label,
        }),
        refColumn,
      ];
    }
  }
  throw new Error(`Unsupported metric operation: ${options.operation}`);
}

export function getMetricApiColumnFromLensState(
  column: CountIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiCountMetricOperation;
export function getMetricApiColumnFromLensState(
  column: CardinalityIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiUniqueCountMetricOperation;
export function getMetricApiColumnFromLensState(
  column:
    | StandardDeviationIndexPatternColumn
    | MinIndexPatternColumn
    | MaxIndexPatternColumn
    | AvgIndexPatternColumn
    | MedianIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiMetricOperation;
export function getMetricApiColumnFromLensState(
  column: SumIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiSumMetricOperation;
export function getMetricApiColumnFromLensState(
  column: StaticValueIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiStaticValueOperation;
export function getMetricApiColumnFromLensState(
  column: FormulaIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiFormulaOperation;
export function getMetricApiColumnFromLensState(
  column: LastValueIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiLastValueOperation;
export function getMetricApiColumnFromLensState(
  column: MovingAverageIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiMovingAverageOperation;
export function getMetricApiColumnFromLensState(
  column: CounterRateIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiCounterRateOperation;
export function getMetricApiColumnFromLensState(
  column: CumulativeSumIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiCumulativeSumOperation;
export function getMetricApiColumnFromLensState(
  column: DerivativeIndexPatternColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiDifferencesOperation;
export function getMetricApiColumnFromLensState(
  options: AnyMetricLensStateColumn,
  columns: Record<string, AnyMetricLensStateColumn>
): LensApiAllMetricOperations {
  if (isLensStateColumnOfType<CountIndexPatternColumn>('count', options)) {
    return fromCountLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<CardinalityIndexPatternColumn>('unique_count', options)) {
    return fromUniqueCountLensStateToAPI(options);
  }
  if (
    isLensStateColumnOfType<AvgIndexPatternColumn>('average', options) ||
    isLensStateColumnOfType<MedianIndexPatternColumn>('median', options) ||
    isLensStateColumnOfType<MinIndexPatternColumn>('min', options) ||
    isLensStateColumnOfType<MaxIndexPatternColumn>('max', options) ||
    isLensStateColumnOfType<StandardDeviationIndexPatternColumn>('standard_deviation', options)
  ) {
    return fromBasicMetricLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<SumIndexPatternColumn>('sum', options)) {
    return fromSumMetricLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<StaticValueIndexPatternColumn>('static_value', options)) {
    return fromStaticValueLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<FormulaIndexPatternColumn>('formula', options)) {
    return fromFormulaLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<LastValueIndexPatternColumn>('last_value', options)) {
    return fromLastValueLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<PercentileIndexPatternColumn>('percentile', options)) {
    return fromPercentileLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<PercentileRanksIndexPatternColumn>('percentile_rank', options)) {
    return fromPercentileRankLensStateToAPI(options);
  }
  if (isLensStateColumnOfType<MovingAverageIndexPatternColumn>('moving_average', options)) {
    if (!options.references || columns[options.references[0]] == null) {
      throw new Error(`Missing referenced metric operation for ${options.operationType}`);
    }
    const refLensStateColumn = columns[options.references[0]];
    const refColumn = getMetricApiColumnFromLensState(
      // @ts-expect-error
      refLensStateColumn,
      columns
    ) as LensApiReferableMetricOperations;
    if (!refColumn || !('field' in refColumn)) {
      throw new Error(`Unsupported referenced metric operation: ${options.operationType}`);
    }
    return fromMovingAverageLensStateToAPI(options, refColumn, refColumn.label ?? '');
  }
  if (isLensStateColumnOfType<CounterRateIndexPatternColumn>('counter_rate', options)) {
    if (!options.references || columns[options.references[0]] == null) {
      throw new Error(`Missing referenced metric operation for ${options.operationType}`);
    }
    const refLensStateColumn = columns[options.references[0]];
    const refColumn = getMetricApiColumnFromLensState(
      // @ts-expect-error
      refLensStateColumn,
      columns
    ) as LensApiReferableMetricOperations;
    if (!refColumn || !('sourceField' in refLensStateColumn)) {
      throw new Error(`Unsupported referenced metric operation: ${options.operationType}`);
    }
    return fromCounterRateLensStateToAPI(options, refLensStateColumn);
  }
  if (isLensStateColumnOfType<CumulativeSumIndexPatternColumn>('cumulative_sum', options)) {
    if (!options.references || columns[options.references[0]] == null) {
      throw new Error(`Missing referenced metric operation for ${options.operationType}`);
    }
    const refLensStateColumn = columns[options.references[0]];
    const refColumn = getMetricApiColumnFromLensState(
      // @ts-expect-error
      refLensStateColumn,
      columns
    ) as LensApiReferableMetricOperations;
    if (!refColumn || !('sourceField' in refLensStateColumn)) {
      throw new Error(`Unsupported referenced metric operation: ${options.operationType}`);
    }
    return fromCumulativeSumLensStateToAPI(options, refLensStateColumn);
  }
  if (isLensStateColumnOfType<DerivativeIndexPatternColumn>('differences', options)) {
    if (!options.references || columns[options.references[0]] == null) {
      throw new Error(`Missing referenced metric operation for ${options.operationType}`);
    }
    const refLensStateColumn = columns[options.references[0]];
    const refColumn = getMetricApiColumnFromLensState(
      // @ts-expect-error
      refLensStateColumn,
      columns
    ) as LensApiReferableMetricOperations;
    if (!refColumn || !('sourceField' in refLensStateColumn)) {
      throw new Error(`Unsupported referenced metric operation: ${options.operationType}`);
    }
    return fromDifferencesLensStateToAPI(options, refColumn, refColumn.label ?? '');
  }
  throw new Error(`Unsupported metric operation`);
}
