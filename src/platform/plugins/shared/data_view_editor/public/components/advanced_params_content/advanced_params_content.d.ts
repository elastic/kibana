import React from 'react';
interface AdvancedParamsContentProps {
    disableAllowHidden: boolean;
    disableId: boolean;
    onAllowHiddenChange?: (value: boolean) => void;
    defaultVisible?: boolean;
}
export declare const AdvancedParamsContent: ({ disableAllowHidden, disableId, onAllowHiddenChange, defaultVisible, }: AdvancedParamsContentProps) => React.JSX.Element;
export {};
