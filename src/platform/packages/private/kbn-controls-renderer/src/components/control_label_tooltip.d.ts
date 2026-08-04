import { type EuiToolTipProps } from '@elastic/eui';
import React from 'react';
interface RelatedPanelProps {
    canIndicateRelatedPanels: boolean;
    isIndicatingRelatedPanels: boolean;
    numberOfRelatedPanels?: number;
}
type AllRelatedPanelPropsOrNone = RelatedPanelProps | {
    [K in keyof RelatedPanelProps]?: never;
};
type Props = Omit<Partial<EuiToolTipProps>, 'children'> & {
    panelLabel?: string;
    panelTooltipLabel?: string;
    children: EuiToolTipProps['children'];
} & AllRelatedPanelPropsOrNone;
export declare const ControlLabelTooltip: ({ canIndicateRelatedPanels, isIndicatingRelatedPanels, numberOfRelatedPanels, panelLabel, panelTooltipLabel, children, ...rest }: Props) => React.JSX.Element;
export {};
