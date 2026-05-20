import React from 'react';
import type { DrilldownFactory } from '../../types';
interface Props {
    factory: DrilldownFactory;
    onSelect: (drilldownType: string) => void;
}
export declare const DrilldownFactoryItem: React.FC<Props>;
export {};
