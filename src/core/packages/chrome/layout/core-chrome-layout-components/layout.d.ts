import React from 'react';
import { type ChromeLayoutComponentProps } from './layout.component';
/**
 * Props for the ChromeLayout component.
 * @public
 */
export type ChromeLayoutProps = ChromeLayoutComponentProps;
/**
 * The main Chrome layout component.
 * Sets up the layout and required global css.
 *
 * @public
 * @param props - Props for the ChromeLayout component.
 * @returns The rendered ChromeLayout component.
 */
export declare const ChromeLayout: ({ children, ...props }: ChromeLayoutProps) => React.JSX.Element;
