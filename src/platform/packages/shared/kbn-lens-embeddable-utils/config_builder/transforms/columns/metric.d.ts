import type { DataType } from '@kbn/lens-common';
import type { LensApiAllMetricOrFormulaOperations, LensApiReferableMetricOperations, LensApiStaticValueOperation } from '../../schema/metric_ops';
import type { AnyLensStateColumn, AnyMetricLensStateColumn, ReferenceMetricLensStateColumn } from './types';
/**
 * Specialized function signatures for transforming metric API operations to Lens state columns
 */
export declare function fromMetricAPItoLensState(options: LensApiAllMetricOrFormulaOperations | LensApiStaticValueOperation, dataType?: DataType): AnyMetricLensStateColumn[];
export declare function getMetricReferableApiColumnFromLensState(parentColumn: ReferenceMetricLensStateColumn, columns: Record<string, AnyLensStateColumn>): LensApiReferableMetricOperations;
export declare function getMetricApiColumnFromLensState(options: AnyMetricLensStateColumn, columns: Record<string, AnyLensStateColumn>): LensApiAllMetricOrFormulaOperations | LensApiStaticValueOperation;
