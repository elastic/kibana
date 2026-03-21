import React from 'react';
import type { Observable } from 'rxjs';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import type { MatchedIndicesSet } from '../../types';
export interface Props {
    type: INDEX_PATTERN_TYPE;
    allowHidden: boolean;
    title: string;
    matchedIndices$: Observable<MatchedIndicesSet>;
}
export declare const PreviewPanel: ({ type, allowHidden, title, matchedIndices$ }: Props) => React.JSX.Element;
