import React from 'react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { DataSourceSelectionChange } from '../types';
interface DataSourceBrowserProps {
    isOpen: boolean;
    isTimeseries: boolean;
    /**
     * Sources passed from autocomplete to render immediately without fetching.
     * If empty/undefined, the browser will fetch sources using Kibana services.
     */
    preloadedSources?: ESQLSourceResult[];
    selectedSources?: string[];
    onClose: () => void;
    onCloseComplete?: () => void;
    onSelect: (sourceName: string, change: DataSourceSelectionChange) => void;
    position?: {
        top?: number;
        left?: number;
    };
}
export declare const DataSourceBrowser: React.FC<DataSourceBrowserProps>;
export {};
