import React from 'react';
import type { ESQLRegistrySolutionId } from '@kbn/esql-types';
import { DataSourceSelectionChange } from '../types';
interface FieldsBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onCloseComplete?: () => void;
    onSelect: (fieldName: string, change: DataSourceSelectionChange) => void;
    /**
     * Fields passed from autocomplete to render immediately without fetching.
     * If empty/undefined, the browser will fetch fields using `getEsqlColumns` when possible.
     */
    preloadedFields: Array<{
        name: string;
        type?: string;
    }>;
    /** Index pattern derived from the main sources list (e.g. "index1,index2" or "*"). */
    indexPattern: string;
    /** Full ES|QL query text used for fetching recommended fields. */
    fullQuery: string;
    activeSolutionId?: ESQLRegistrySolutionId;
    position?: {
        top?: number;
        left?: number;
    };
}
export declare const FieldsBrowser: React.FC<FieldsBrowserProps>;
export {};
