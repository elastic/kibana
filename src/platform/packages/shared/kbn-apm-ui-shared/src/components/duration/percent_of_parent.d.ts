import React from 'react';
interface PercentOfParentProps {
    duration: number;
    totalDuration?: number;
    parentType: 'trace' | 'transaction';
}
export declare function PercentOfParent({ duration, totalDuration, parentType }: PercentOfParentProps): React.JSX.Element;
export {};
