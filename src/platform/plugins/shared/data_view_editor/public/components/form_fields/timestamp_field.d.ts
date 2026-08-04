import React from 'react';
import type { Observable } from 'rxjs';
import type { ValidationConfig } from '../../shared_imports';
import type { TimestampOption, MatchedIndicesSet } from '../../types';
interface Props {
    options$: Observable<TimestampOption[]>;
    isLoadingOptions$: Observable<boolean>;
    matchedIndices$: Observable<MatchedIndicesSet>;
    disabled?: boolean;
}
export declare const requireTimestampOptionValidator: (options: TimestampOption[]) => ValidationConfig<any, string, {
    value?: any;
}>;
export declare const TimestampField: ({ options$, isLoadingOptions$, matchedIndices$, disabled, }: Props) => React.JSX.Element;
export {};
