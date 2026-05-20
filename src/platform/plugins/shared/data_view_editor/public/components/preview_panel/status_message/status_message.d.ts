import React from 'react';
import type { MatchedIndicesSet } from '../../../types';
interface StatusMessageProps {
    matchedIndices: MatchedIndicesSet;
    isIncludingSystemIndices: boolean;
    query: string;
    showSystemIndices: boolean;
}
export declare const StatusMessage: React.FC<StatusMessageProps>;
export {};
