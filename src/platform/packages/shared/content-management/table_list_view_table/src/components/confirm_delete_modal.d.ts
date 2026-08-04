import React from 'react';
interface Props<T> {
    /** Flag to indicate if the items are being deleted */
    isDeletingItems: boolean;
    /** Array of items to delete */
    items: T[];
    /** The name of the entity to delete (singular) */
    entityName: string;
    /** The name of the entity to delete (plural) */
    entityNamePlural: string;
    /** Handler to be called when clicking the "Cancel" button */
    onCancel: () => void;
    /** Handler to be called when clicking the "Confirm" button */
    onConfirm: () => void;
}
export declare function ConfirmDeleteModal<T>({ isDeletingItems, items, entityName, entityNamePlural, onCancel, onConfirm, }: Props<T>): React.JSX.Element;
export {};
