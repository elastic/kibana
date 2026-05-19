import React from 'react';
interface Props {
    activeStepIndex: number;
    lastStep: number;
    onBack: () => void;
    onNext: () => void;
    isSaving?: boolean;
    isStepValid?: boolean;
    texts?: Partial<NavTexts>;
    getRightContent?: () => JSX.Element | null | undefined;
}
export interface NavTexts {
    back: string | JSX.Element;
    next: string | JSX.Element;
    save: string | JSX.Element;
    saving: string | JSX.Element;
}
export declare const FormWizardNav: ({ activeStepIndex, lastStep, isStepValid, isSaving, onBack, onNext, texts, getRightContent, }: Props) => React.JSX.Element;
export {};
