import React from 'react';
import type { EuiAccordionProps } from '@elastic/eui';
import type { Action } from './section_actions';
export interface ContentFrameworkSectionProps {
    id: string;
    title: string;
    description?: string;
    actions?: Action[];
    children: React.ReactNode;
    'data-test-subj'?: string;
    onToggle?: (isOpen: boolean) => void;
    forceState?: EuiAccordionProps['forceState'];
    isTechPreview?: boolean;
    hasBorder?: boolean;
    hasPadding?: boolean;
}
export declare function ContentFrameworkSection({ id, title, description, actions, children, onToggle, forceState, 'data-test-subj': accordionDataTestSubj, isTechPreview, hasBorder, hasPadding, }: ContentFrameworkSectionProps): React.JSX.Element;
