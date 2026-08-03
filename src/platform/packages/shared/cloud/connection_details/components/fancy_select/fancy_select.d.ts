import * as React from 'react';
import type { FancySelectOption } from './types';
export interface FancySelectProps {
    value: string;
    options: FancySelectOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
}
export declare const FancySelect: React.FC<FancySelectProps>;
