import React, { type FC, type ReactElement } from 'react';
import { type EmbeddableApiContext, type ViewMode } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export interface FloatingActionsProps {
    children: ReactElement;
    prependWrapperRef: React.RefObject<HTMLDivElement>;
    api?: unknown;
    uuid: string;
    viewMode?: ViewMode;
    disabledActions?: string[];
}
export type FloatingActionItem = Omit<Action<EmbeddableApiContext>, 'MenuItem'> & {
    MenuItem: FC<{}>;
};
export declare const FloatingActions: FC<FloatingActionsProps>;
