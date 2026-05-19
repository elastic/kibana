import React from 'react';
import type { SavedQuery, SavedQueryService } from '@kbn/data-plugin/public';
interface Props {
    savedQuery?: SavedQuery;
    savedQueryService: SavedQueryService;
    onSave: (savedQueryMeta: SavedQueryMeta) => void;
    onClose: () => void;
    showFilterOption: boolean | undefined;
    showTimeFilterOption: boolean | undefined;
}
export interface SavedQueryMeta {
    id?: string;
    title: string;
    description: string;
    shouldIncludeFilters: boolean;
    shouldIncludeTimefilter: boolean;
}
export declare function SaveQueryForm({ savedQuery, savedQueryService, onSave, onClose, showFilterOption, showTimeFilterOption, }: Props): React.JSX.Element;
export {};
