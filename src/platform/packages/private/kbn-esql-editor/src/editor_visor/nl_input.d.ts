import React from 'react';
import type { SerializedStyles } from '@emotion/react';
interface NLInputProps {
    value: string;
    placeholder: string;
    disabled: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    inputStyles: SerializedStyles;
}
export declare function NLInput({ value, placeholder, disabled, onChange, onSubmit, inputStyles, }: NLInputProps): React.JSX.Element;
export {};
