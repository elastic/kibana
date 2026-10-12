import type { WithEuiThemeProps } from '@elastic/eui';
import React from 'react';
import type { SaveResult } from './show_saved_object_save_modal';
export interface OnSaveProps {
    newTitle: string;
    newCopyOnSave: boolean;
    newDescription: string;
}
export interface Reference {
    type: string;
    id: string;
    name: string;
}
export interface SaveDashboardReturn {
    id?: string;
    error?: string;
    references?: Reference[];
    redirectRequired?: boolean;
}
interface Props<T = void> {
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
    onSave: (props: OnSaveProps) => Promise<T>;
    onClose: () => void;
    lastSavedTitle: string;
    title: string;
    showCopyOnSave: boolean;
    mustCopyOnSaveMessage?: string;
    onCopyOnSaveChange?: (copyOnChange: boolean) => void;
    initialCopyOnSave?: boolean;
    objectType: string;
    confirmButtonLabel?: React.ReactNode;
    options?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
    rightOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
    description?: string;
    showDescription: boolean;
    isValid?: boolean;
    customModalTitle?: string | React.ReactNode;
    theme: WithEuiThemeProps['theme'];
    /** When true, renders content without wrapping in EuiModal */
    disableModal?: boolean;
    /**
     * The `id` to set on `EuiModalHeaderTitle`. When `disableModal` is true, the caller owns the
     * `EuiModal` shell and must pass this id so it can set `aria-labelledby` pointing to this title,
     * satisfying EUI's accessibility requirement. When `disableModal` is false, the id is generated
     * internally and applied to both the title and the modal.
     */
    modalTitleId?: string;
}
export interface SaveModalState {
    title: string;
    copyOnSave: boolean;
    isTitleDuplicateConfirmed: boolean;
    hasTitleDuplicate: boolean;
    isSaving: boolean;
    visualizationDescription: string;
    hasAttemptedSubmit: boolean;
}
/**
 * @deprecated
 */
export declare const SavedObjectSaveModal: React.ForwardRefExoticComponent<Omit<Props<void>, "theme"> & React.RefAttributes<Omit<Props<void>, "theme">>>;
/**
 * This is a workaround for using this directly with the `showSaveModal` method.
 *
 * The `showSaveModal` method wraps and calls these props from outside but this modal
 * does not require the `SaveResult` to be returned from `onSave`.
 *
 * @deprecated
 */
export declare const SavedObjectSaveModalWithSaveResult: React.ForwardRefExoticComponent<Omit<Props<SaveResult>, "theme"> & React.RefAttributes<Omit<Props<SaveResult>, "theme">>>;
export {};
