import { type DataView } from '@kbn/data-views-plugin/public';
import React from 'react';
export interface DiscoverTopNavProps {
    savedQuery?: string;
    esqlModeErrors?: Error;
    esqlModeWarning?: string;
    onFieldEdited: (options: {
        editedDataView: DataView;
        removedFieldName?: string;
    }) => Promise<void>;
    isLoading?: boolean;
    onCancelClick?: () => void;
}
export declare const DiscoverTopNav: ({ savedQuery, esqlModeErrors, esqlModeWarning, onFieldEdited, isLoading, onCancelClick, }: DiscoverTopNavProps) => React.JSX.Element;
