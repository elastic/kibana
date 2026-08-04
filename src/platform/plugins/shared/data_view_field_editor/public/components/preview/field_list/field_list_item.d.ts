import React from 'react';
import type { DocumentField } from './field_list';
export interface PreviewListItemProps {
    field: DocumentField;
    toggleIsPinned?: (name: string, keyboardEvent: {
        isKeyboardEvent: boolean;
        buttonId: string;
    }) => void;
    hasScriptError?: boolean;
    /** Indicates whether the field list item comes from the Painless script */
    isFromScript?: boolean;
}
export declare const PreviewListItem: React.FC<PreviewListItemProps>;
