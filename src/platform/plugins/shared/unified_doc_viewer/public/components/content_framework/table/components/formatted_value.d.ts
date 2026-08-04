import React, { type ReactNode } from 'react';
interface FormattedValueProps {
    value: ReactNode;
    truncate?: boolean;
}
export declare function FormattedValue({ value, truncate }: FormattedValueProps): React.JSX.Element;
export {};
