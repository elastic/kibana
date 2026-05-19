import React from 'react';
export { VisorMode } from './mode_selector';
export interface QuickSearchVisorProps {
    query: string;
    isSpaceReduced?: boolean;
    isVisible: boolean;
    onUpdateAndSubmitQuery: (query: string) => void;
    onToggleVisor: () => void;
}
export declare const searchPlaceholder: string;
export declare function QuickSearchVisor({ query, isSpaceReduced, isVisible, onUpdateAndSubmitQuery, onToggleVisor, }: QuickSearchVisorProps): React.JSX.Element | null;
