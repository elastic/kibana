import React from 'react';
export interface Props {
    fieldsToDelete: string[];
    closeModal: () => void;
    confirmDelete: () => void;
}
export declare function DeleteFieldModal({ fieldsToDelete, closeModal, confirmDelete }: Props): React.JSX.Element;
