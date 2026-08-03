import type { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import type { ReactNode, RefObject } from 'react';
import React from 'react';
export declare const PanelTitle: ({ queryBarMenuRef, title, append, }: {
    queryBarMenuRef: RefObject<EuiContextMenuClass>;
    title: string;
    append?: ReactNode;
}) => React.JSX.Element;
