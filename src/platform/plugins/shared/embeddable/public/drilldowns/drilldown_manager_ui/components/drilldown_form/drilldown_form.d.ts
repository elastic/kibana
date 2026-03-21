import type { FC, PropsWithChildren } from 'react';
import type { TriggerPickerProps } from '../trigger_picker';
export interface FormDrilldownWizardProps {
    /** Value of name field. */
    name?: string;
    /** Callback called on name change. */
    onNameChange?: (name: string) => void;
    /** Trigger picker props. */
    triggers?: TriggerPickerProps;
    /** Whether the form elements should be disabled. */
    disabled?: boolean;
}
export declare const DrilldownForm: FC<PropsWithChildren<FormDrilldownWizardProps>>;
