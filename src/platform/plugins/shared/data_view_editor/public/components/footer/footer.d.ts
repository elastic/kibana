import React from 'react';
export declare enum SubmittingType {
    savingAsAdHoc = "savingAsAdHoc",
    persisting = "persisting"
}
interface FooterProps {
    onCancel: () => void;
    onSubmit: (isAdHoc?: boolean) => void;
    onDuplicate?: () => void;
    submittingType: SubmittingType | undefined;
    submitDisabled: boolean;
    hasEditData: boolean;
    isPersisted: boolean;
    allowAdHoc: boolean;
    canSave: boolean;
    isManaged: boolean;
    isDuplicating: boolean;
}
export declare const Footer: ({ onCancel, onSubmit, submittingType, submitDisabled, hasEditData, allowAdHoc, isPersisted, canSave, onDuplicate, isManaged, isDuplicating, }: FooterProps) => React.JSX.Element;
export {};
