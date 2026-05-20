import type { ReactNode } from 'react';
import React from 'react';
import type { Observable } from 'rxjs';
import type { RollupIndicesCapsResponse, MatchedIndicesSet } from '../../types';
interface TitleFieldProps {
    isRollup: boolean;
    matchedIndices$: Observable<MatchedIndicesSet>;
    rollupIndicesCapabilities: RollupIndicesCapsResponse;
    indexPatternValidationProvider: () => Promise<{
        matchedIndices: MatchedIndicesSet;
        rollupIndex: string | null | undefined;
    }>;
    disabled?: boolean;
    titleHelpText?: ReactNode | string;
}
export declare const TitleField: ({ isRollup, matchedIndices$, rollupIndicesCapabilities, indexPatternValidationProvider, disabled, titleHelpText, }: TitleFieldProps) => React.JSX.Element;
export {};
