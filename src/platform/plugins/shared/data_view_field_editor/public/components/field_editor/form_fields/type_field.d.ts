import React from 'react';
import type { TypeSelection } from '../types';
interface Props {
    isDisabled?: boolean;
    includeComposite?: boolean;
    path: string;
    defaultValue?: TypeSelection;
}
export declare const TypeField: ({ isDisabled, includeComposite, path, defaultValue, }: Props) => React.JSX.Element;
export {};
