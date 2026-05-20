import React from 'react';
import type { CommonProps } from '@elastic/eui';
export interface SaveButtonProps extends CommonProps {
    onSave: () => Promise<void>;
    label?: string;
    isSaving?: boolean;
}
export interface DraftModeCalloutProps extends CommonProps {
    message?: string;
    saveButtonProps?: SaveButtonProps;
}
/**
 * A warning callout to indicate the user has unsaved changes.
 */
export declare const DraftModeCallout: ({ message, ["data-test-subj"]: dataTestSubj, saveButtonProps, }: DraftModeCalloutProps) => React.JSX.Element;
