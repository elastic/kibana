import React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
interface Props {
    addDataHref: string;
    application: ApplicationStart;
    devToolsHref?: string;
    hidden?: boolean;
    managementHref?: string;
    showDevToolsLink?: boolean;
    showManagementLink?: boolean;
}
export declare const overviewPageActions: ({ addDataHref, application, devToolsHref, hidden, managementHref, showDevToolsLink, showManagementLink, }: Props) => (React.JSX.Element | null)[];
export {};
