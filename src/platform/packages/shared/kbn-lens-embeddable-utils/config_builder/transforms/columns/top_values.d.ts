import { type TermsIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiTermsOperation } from '../../schema/bucket_ops';
import type { AnyLensStateColumn } from './types';
export declare function fromTermsLensApiToLensState(options: LensApiTermsOperation, getMetricColumnIdByIndex: (index: number) => string | undefined): TermsIndexPatternColumn;
export declare function fromTermsLensStateToAPI(column: TermsIndexPatternColumn, columns: {
    column: AnyLensStateColumn;
    id: string;
}[]): LensApiTermsOperation;
