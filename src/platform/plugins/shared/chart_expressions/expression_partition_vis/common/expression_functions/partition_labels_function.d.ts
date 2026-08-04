import type { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import { PARTITION_LABELS_FUNCTION } from '../constants';
import type { ExpressionValuePartitionLabels, PartitionLabelsArguments } from '../types';
export declare const partitionLabelsFunction: () => ExpressionFunctionDefinition<typeof PARTITION_LABELS_FUNCTION, Datatable | null, PartitionLabelsArguments, ExpressionValuePartitionLabels>;
