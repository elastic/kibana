import React from 'react';
interface NewBucketButtonProps {
    label: string;
    onClick: () => void;
    isDisabled?: boolean;
    'data-test-subj'?: string;
}
export declare const NewBucketButton: ({ label, onClick, isDisabled, "data-test-subj": dataTestSubj, }: NewBucketButtonProps) => React.JSX.Element;
export {};
