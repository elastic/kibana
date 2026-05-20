import React from 'react';
import type { Field } from '../types';
export interface Props {
    /**
     * Handler for the "save" footer button
     */
    onSave: (field: Field) => void;
    /**
     * Handler for the "cancel" footer button
     */
    onCancel: () => void;
    /** Optional field to process */
    fieldToEdit?: Field;
    /** Optional preselected configuration for new field */
    fieldToCreate?: Field;
    /** Handler to call when the component mounts.
     *  We will pass "up" data that the parent component might need
     */
    onMounted?: (args: {
        canCloseValidator: () => boolean;
    }) => void;
}
export declare const FieldEditorFlyoutContent: React.MemoExoticComponent<({ fieldToEdit, fieldToCreate, onSave, onCancel, onMounted, }: Props) => React.JSX.Element>;
