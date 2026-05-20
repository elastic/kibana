import type { ReactNode, ReactElement } from 'react';
import React from 'react';
export interface ConsoleTourStepProps {
    step: number;
    stepsTotal: number;
    isStepOpen: boolean;
    title: ReactNode;
    content: ReactNode;
    onFinish: () => void;
    footerAction: ReactNode | ReactNode[];
    dataTestSubj: string;
    anchorPosition: string;
    maxWidth: number;
    css?: any;
}
interface Props {
    tourStepProps: ConsoleTourStepProps;
    children: ReactNode & ReactElement;
}
export declare const ConsoleTourStep: ({ tourStepProps, children }: Props) => React.JSX.Element;
export {};
