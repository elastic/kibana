import React from 'react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
interface ExploreMatchingButtonProps {
    noDataViewMatches: boolean;
    indexMatches: number;
    dataViewSearchString: string;
    onCreateDefaultAdHocDataView?: (dataViewSpec: DataViewSpec) => void;
    setPopoverIsOpen: (isOpen: boolean) => void;
}
export declare const ExploreMatchingButton: ({ noDataViewMatches, indexMatches, dataViewSearchString, setPopoverIsOpen, onCreateDefaultAdHocDataView, }: ExploreMatchingButtonProps) => React.JSX.Element | null;
export {};
