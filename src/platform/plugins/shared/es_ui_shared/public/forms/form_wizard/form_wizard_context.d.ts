import React from 'react';
import type { HookProps } from '../multi_content';
export interface Props<T extends object> {
    onSave: (data: T) => void | Promise<void>;
    children: JSX.Element | Array<JSX.Element | null | false>;
    isEditing?: boolean;
    defaultActiveStep?: number;
    defaultValue?: HookProps<T>['defaultValue'];
    onChange?: HookProps<T>['onChange'];
    onStepChange?: (id: string) => void;
}
interface State {
    activeStepIndex: number;
    steps: Steps;
}
export interface Step {
    id: string;
    index: number;
    label: string;
    isRequired: boolean;
    isComplete: boolean;
}
export interface Steps {
    [stepId: string]: Step;
}
export interface Context<Id extends string = any> extends State {
    activeStepId: Id;
    lastStep: number;
    isCurrentStepValid: boolean | undefined;
    navigateToStep: (stepId: number | Id) => void;
    addStep: (id: Id, label: string, isRequired?: boolean) => void;
}
export declare const FormWizardProvider: <T extends object = {
    [key: string]: any;
}>(props: Props<any> & HookProps<T>) => React.JSX.Element;
export declare const FormWizardConsumer: React.Consumer<Context<any>>;
export declare function useFormWizardContext<T extends string = any>(): Context<T>;
export {};
