import type { FiltersIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiFiltersOperation } from '../../schema/bucket_ops';
export declare function fromFiltersLensApiToLensState(options: LensApiFiltersOperation): FiltersIndexPatternColumn;
export declare function fromFiltersLensStateToAPI(column: FiltersIndexPatternColumn): LensApiFiltersOperation;
