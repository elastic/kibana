import React from 'react';
import type { SearchResponseWarning } from '../../types';
interface Props {
    warnings: SearchResponseWarning[];
    isDismissed: boolean;
    onDismiss: () => void;
}
export declare const SearchResponseWarningsCallout: (props: Props) => React.JSX.Element | null;
export {};
