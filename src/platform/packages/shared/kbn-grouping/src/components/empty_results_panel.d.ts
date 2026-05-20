import React from 'react';
declare const heights: {
    tall: number;
    short: number;
};
export declare const EmptyGroupingComponent: React.FC<{
    height?: keyof typeof heights;
}>;
export {};
