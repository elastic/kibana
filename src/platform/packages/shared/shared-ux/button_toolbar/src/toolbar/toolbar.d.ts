import type { ReactElement } from 'react';
import React from 'react';
import type { ToolbarPopover } from '../popover';
import type { IconButtonGroup, ToolbarButton } from '../buttons';
/** type for cases with both button or a popover could be used */
export type ToolbarButtonType = typeof ToolbarButton | typeof ToolbarPopover;
/** Specific type for the toolbar children in its props */
interface NamedSlots {
    primaryButton: ReactElement<ToolbarButtonType>;
    iconButtonGroup?: ReactElement<typeof IconButtonGroup>;
    extraButtons?: Array<ReactElement<ToolbarButtonType>> | undefined;
}
/**
 * Props for a generic toolbar component
 */
export interface Props {
    children: NamedSlots;
}
/**
 *
 * @param children of the toolbar such as a popover or button
 * @returns Toolbar component
 */
export declare const Toolbar: ({ children }: Props) => React.JSX.Element;
export {};
