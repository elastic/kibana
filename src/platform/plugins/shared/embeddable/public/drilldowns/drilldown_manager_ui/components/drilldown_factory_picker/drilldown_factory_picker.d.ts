import React from 'react';
import type { DrilldownFactory } from '../../types';
interface Props {
    factories: DrilldownFactory[];
    onSelect: (factory: DrilldownFactory) => void;
}
export declare const DrilldownFactoryPicker: React.FC<Props>;
export {};
