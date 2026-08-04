import React from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
export interface SimilarErrorsProps {
    hit: DataTableRecord;
}
export declare function SimilarErrors({ hit }: SimilarErrorsProps): React.JSX.Element | undefined;
