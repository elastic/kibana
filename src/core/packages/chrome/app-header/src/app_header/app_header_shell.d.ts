import type { ReactNode } from 'react';
import React from 'react';
import type { AppHeaderPadding } from '../types';
export interface AppHeaderShellProps {
    title?: ReactNode;
    badges?: ReactNode;
    titleActions?: ReactNode;
    titleAppend?: ReactNode;
    trailing?: ReactNode;
    metadata?: ReactNode;
    tabs?: ReactNode;
    sticky?: boolean;
    padding?: AppHeaderPadding;
    borderless?: boolean;
}
export declare const AppHeaderShell: React.NamedExoticComponent<AppHeaderShellProps>;
