import React from 'react';
export interface ValueInputProps {
    onError?: (error: string | null) => void;
    value: string;
    label?: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    autoFocus?: boolean;
    className?: string;
    isInvalid?: boolean;
    placeholder?: string;
}
export declare const StringInput: ({ onError, ...restOfProps }: ValueInputProps) => React.JSX.Element;
export declare const NumberInput: ({ onError, ...restOfProps }: ValueInputProps) => React.JSX.Element;
export declare const BooleanInput: ({ onError, onChange, ...restOfProps }: ValueInputProps) => React.JSX.Element;
export declare function getInputComponentForType(type: string | undefined): React.FC<ValueInputProps>;
