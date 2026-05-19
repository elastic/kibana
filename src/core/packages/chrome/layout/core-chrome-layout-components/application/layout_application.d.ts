import type { ReactNode } from 'react';
import React from 'react';
/**
 * The application slot wrapper
 *
 * @param props - Props for the LayoutApplication component.
 * @returns The rendered LayoutApplication component.
 */
export declare const LayoutApplication: ({ children, topBar, bottomBar, }: {
    children: ReactNode;
    topBar?: ReactNode;
    bottomBar?: ReactNode;
}) => React.JSX.Element;
