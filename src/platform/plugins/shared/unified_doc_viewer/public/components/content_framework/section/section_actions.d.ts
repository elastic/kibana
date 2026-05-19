import React from 'react';
import type { IconType } from '@elastic/eui';
import type { EbtClickAttrs } from '@kbn/ebt-click';
interface BaseAction {
    icon: IconType;
    ariaLabel: string;
    dataTestSubj?: string;
    label?: string;
    id?: string;
    ebt: EbtClickAttrs;
}
export type Action = (BaseAction & {
    onClick: () => void;
    href?: string;
}) | (BaseAction & {
    href: string;
    onClick?: () => void;
});
export interface SectionActionsProps {
    actions: Action[];
}
export declare const SectionActions: ({ actions }: SectionActionsProps) => React.JSX.Element | null;
export {};
