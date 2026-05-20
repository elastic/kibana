import type { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import type { RefObject } from 'react';
import React from 'react';
import type { SavedQuery, SavedQueryService } from '@kbn/data-plugin/public';
export interface SavedQueryManagementListProps {
    showSaveQuery?: boolean;
    loadedSavedQuery?: SavedQuery;
    savedQueryService: SavedQueryService;
    queryBarMenuRef: RefObject<EuiContextMenuClass>;
    onLoad: (savedQuery: SavedQuery) => void;
    onClearSavedQuery: () => void;
    onClose: () => void;
}
export declare const SavedQueryManagementList: ({ showSaveQuery, loadedSavedQuery, savedQueryService, queryBarMenuRef, onLoad, onClearSavedQuery, onClose, }: SavedQueryManagementListProps) => React.JSX.Element;
