import React from 'react';
import type { DocumentDiffMode } from './types';
export interface ComparisonControlsProps {
    isPlainRecord?: boolean;
    selectedDocIds: string[];
    showDiff: boolean | undefined;
    diffMode: DocumentDiffMode | undefined;
    showDiffDecorations: boolean | undefined;
    showMatchingValues: boolean | undefined;
    showAllFields: boolean | undefined;
    forceShowAllFields: boolean;
    setIsCompareActive: (isCompareActive: boolean) => void;
    setShowDiff: (showDiff: boolean) => void;
    setDiffMode: (diffMode: DocumentDiffMode) => void;
    setShowDiffDecorations: (showDiffDecorations: boolean) => void;
    setShowMatchingValues: (showMatchingValues: boolean) => void;
    setShowAllFields: (showAllFields: boolean) => void;
}
export declare const ComparisonControls: ({ isPlainRecord, selectedDocIds, showDiff, diffMode, showDiffDecorations, showMatchingValues, showAllFields, forceShowAllFields, setIsCompareActive, setShowDiff, setDiffMode, setShowDiffDecorations, setShowMatchingValues, setShowAllFields, }: ComparisonControlsProps) => React.JSX.Element;
