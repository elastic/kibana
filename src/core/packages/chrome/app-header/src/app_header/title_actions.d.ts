import type { ReactNode } from 'react';
import React from 'react';
import type { ShareAction } from './hooks';
export interface TitleActionsProps {
    shareAction?: ShareAction;
    favorite?: ReactNode;
}
export declare const TitleActions: React.NamedExoticComponent<TitleActionsProps>;
