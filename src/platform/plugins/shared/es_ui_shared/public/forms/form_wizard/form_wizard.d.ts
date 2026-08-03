import React from 'react';
import type { Props as ProviderProps } from './form_wizard_context';
import type { NavTexts } from './form_wizard_nav';
interface Props<T extends object, S extends string> extends ProviderProps<T> {
    isSaving?: boolean;
    apiError: JSX.Element | null;
    texts?: Partial<NavTexts>;
    rightContentNav?: JSX.Element | null | ((stepId: S) => JSX.Element | null);
}
export declare function FormWizard<T extends object = {
    [key: string]: any;
}, S extends string = any>({ texts, defaultActiveStep, defaultValue, apiError, isEditing, isSaving, onSave, onChange, onStepChange, children, rightContentNav, }: Props<T, S>): React.JSX.Element;
export {};
