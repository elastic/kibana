import React from 'react';
import type { ESQLFieldWithMetadata, RecommendedField } from '@kbn/esql-types';
import { DataSourceSelectionChange } from '../types';
interface FieldsBrowserProps {
    isOpen: boolean;
    isLoading: boolean;
    onClose: () => void;
    onSelect: (fieldName: string, change: DataSourceSelectionChange) => void;
    allFields: ESQLFieldWithMetadata[];
    recommendedFields: RecommendedField[];
    position?: {
        top?: number;
        left?: number;
    };
}
export declare const FieldsBrowser: React.FC<FieldsBrowserProps>;
export {};
