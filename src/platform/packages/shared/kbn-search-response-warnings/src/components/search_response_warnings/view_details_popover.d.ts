import React from 'react';
import type { SearchResponseWarning } from '../../types';
interface Props {
    displayAsLink?: boolean;
    warnings: SearchResponseWarning[];
}
export declare const ViewDetailsPopover: (props: Props) => React.JSX.Element | null;
export {};
