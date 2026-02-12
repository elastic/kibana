import React from 'react';
import type { UrlDrilldownOptions } from '../../types';
export interface UrlDrilldownOptionsProps {
    options: UrlDrilldownOptions;
    onOptionChange: (newOptions: Partial<UrlDrilldownOptions>) => void;
}
export declare const UrlDrilldownOptionsComponent: ({ options, onOptionChange, }: UrlDrilldownOptionsProps) => React.JSX.Element;
