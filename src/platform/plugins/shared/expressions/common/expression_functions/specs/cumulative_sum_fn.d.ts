import type { Datatable } from '../../expression_types';
import type { CumulativeSumArgs } from './cumulative_sum';
export declare const cumulativeSumFn: (input: Datatable, { by, inputColumnId, outputColumnId, outputColumnName }: CumulativeSumArgs) => Datatable;
