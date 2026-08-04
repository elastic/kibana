import React from 'react';
export declare const DATA_TEST_SUBJ_SAVE_BUTTON = "settings-save-button";
export declare const DATA_TEST_SUBJ_CANCEL_BUTTON = "settings-cancel-button";
/**
 * Props for a {@link BottomBar} component.
 */
export interface BottomBarProps {
    onSaveAll: () => void;
    onClearAllUnsaved: () => void;
    hasInvalidChanges: boolean;
    isLoading: boolean;
    unsavedChangesCount: number;
    hiddenChangesCount: number;
}
/**
 * Component for displaying the bottom bar of a {@link Form}.
 */
export declare const BottomBar: ({ onSaveAll, onClearAllUnsaved, hasInvalidChanges, isLoading, unsavedChangesCount, hiddenChangesCount, }: BottomBarProps) => React.JSX.Element;
