import React from 'react';
import type { ContextRowModel } from '../types';
import { type LinksListItem } from '../types';
export interface ContextMenuViewProps {
    readonly environmentRow: ContextRowModel;
    readonly spacesRow: ContextRowModel;
    readonly footerLinks?: ReadonlyArray<LinksListItem>;
    readonly onClickEnvironmentRow: () => void;
    readonly onClickSpacesRow: () => void;
}
/**
 * The menu view for the context switcher that contains the environment row and the spaces row.
 */
export declare const ContextMenuView: ({ environmentRow, spacesRow, onClickEnvironmentRow, onClickSpacesRow, footerLinks, }: ContextMenuViewProps) => React.JSX.Element;
