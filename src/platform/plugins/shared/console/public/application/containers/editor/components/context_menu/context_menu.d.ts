import React from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { EditorRequest } from '../../types';
interface Props {
    getRequests: () => Promise<EditorRequest[]>;
    getDocumentation: () => Promise<string | null>;
    autoIndent: (ev: React.MouseEvent) => void;
    notifications: Pick<NotificationsStart, 'toasts'>;
    getIsKbnRequestSelected: () => Promise<boolean | null>;
}
export declare const ContextMenu: ({ getRequests, getDocumentation, autoIndent, notifications, getIsKbnRequestSelected, }: Props) => React.JSX.Element;
export {};
