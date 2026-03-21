import React from 'react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { DataSourceSelectionChange } from '../types';
interface DataSourceBrowserProps {
    isOpen: boolean;
    isLoading: boolean;
    allSources: ESQLSourceResult[];
    selectedSources?: string[];
    onClose: () => void;
    onSelect: (sourceName: string, change: DataSourceSelectionChange) => void;
    position?: {
        top?: number;
        left?: number;
    };
}
export declare const DataSourceBrowser: React.FC<DataSourceBrowserProps>;
export {};
