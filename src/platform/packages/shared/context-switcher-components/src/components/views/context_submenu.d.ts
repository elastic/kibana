import React from 'react';
import type { ReactNode } from 'react';
import type { ActionConfig, LinksListItem } from '../types';
export interface ContextSubmenuViewProps {
    readonly title: ReactNode;
    readonly onBack: () => void;
    readonly items: ReadonlyArray<LinksListItem>;
    readonly footerAction?: ActionConfig;
}
/**
 * The submenu view for the environment context that contains the title, the links list and the footer action.
 */
export declare const ContextSubmenuView: ({ title, onBack, items, footerAction, }: ContextSubmenuViewProps) => React.JSX.Element;
