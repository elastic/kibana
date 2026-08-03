import React, { type PropsWithChildren } from 'react';
import { type HtmlPortalNode } from 'react-reverse-portal';
import { type RuntimeStateManager } from '../../state_management/redux';
export type ChartPortalNode = HtmlPortalNode;
export type ChartPortalNodes = Record<string, ChartPortalNode>;
export declare const ChartPortalsRenderer: ({ runtimeStateManager, children, }: PropsWithChildren<{
    runtimeStateManager: RuntimeStateManager;
}>) => React.JSX.Element;
