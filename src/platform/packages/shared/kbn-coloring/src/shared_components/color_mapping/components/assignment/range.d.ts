import React from 'react';
import type { ColorMapping } from '../../config';
export declare const Range: React.FC<{
    rule: ColorMapping.RuleRange;
    updateValue: (min: number, max: number, minInclusive: boolean, maxInclusive: boolean) => void;
}>;
