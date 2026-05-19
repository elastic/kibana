import type { EuiAccordionProps } from '@elastic/eui';
import React from 'react';
import type { ReactElement } from 'react';
export interface ScrollableSectionWrapperApi {
    openAndScrollToSection: () => void;
}
export type ScrollableSectionWrapperChildrenProps = Pick<EuiAccordionProps, 'forceState' | 'onToggle'>;
export interface ScrollableSectionWrapperProps {
    children: (props: ScrollableSectionWrapperChildrenProps) => ReactElement;
    defaultState?: EuiAccordionProps['forceState'];
}
export declare const ScrollableSectionWrapper: React.ForwardRefExoticComponent<ScrollableSectionWrapperProps & React.RefAttributes<ScrollableSectionWrapperApi>>;
