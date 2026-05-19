import React from 'react';
interface Props {
    name?: string;
    icon?: string;
    /** On drilldown type change click. */
    onChange?: () => void;
}
export declare const DrilldownFactory: React.FC<Props>;
export {};
