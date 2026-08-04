import React from 'react';
interface EsqlApproximationToggleProps {
    isApproximate: boolean;
    onChange: (isApproximate: boolean) => void;
    additionalText?: string;
    disabled?: boolean;
}
export declare const EsqlApproximationToggle: ({ isApproximate, onChange, additionalText, disabled, }: EsqlApproximationToggleProps) => React.JSX.Element;
export {};
