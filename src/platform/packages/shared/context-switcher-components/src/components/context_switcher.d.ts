import React from 'react';
import { type ContextSwitcherProps } from './types';
/**
 * The context switcher component.
 * It shows a trigger button and a popover.
 * The popover can be a single step or a two step content.
 * The single step content is the spaces list.
 * The two step content is the context menu and the spaces list.
 */
export declare const ContextSwitcher: ({ spaces, environmentContext, footerLinks, onOpen, }: ContextSwitcherProps) => React.JSX.Element;
