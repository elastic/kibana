import React, { type FC, type ReactElement } from 'react';
import type { AnyApiAction } from '@kbn/presentation-panel-plugin/public/panel_actions/types';
import { type ViewMode } from '@kbn/presentation-publishing';
export interface FloatingActionsProps {
    children: ReactElement;
    prependWrapperRef: React.RefObject<HTMLDivElement>;
    api?: unknown;
    uuid: string;
    viewMode?: ViewMode;
    disabledActions?: string[];
}
export type FloatingActionItem = Omit<AnyApiAction, 'MenuItem'> & {
    MenuItem: FC<{}>;
};
export declare const FloatingActions: FC<FloatingActionsProps>;
