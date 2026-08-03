import React from 'react';
import type { SearchResponseWarning } from '../../types';
interface Props {
    onViewDetailsClick?: () => void;
    warnings: SearchResponseWarning[];
}
export declare const SearchResponseWarningsBadgePopoverContent: (props: Props) => React.JSX.Element;
export {};
