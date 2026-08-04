import type { History } from 'history';
import React from 'react';
import type { DashboardApi } from '..';
import type { DashboardRedirect } from './types';
import { type DashboardEmbedSettings } from './types';
export interface DashboardAppProps {
    history: History;
    savedDashboardId?: string;
    redirectTo: DashboardRedirect;
    embedSettings?: DashboardEmbedSettings;
    expandedPanelId?: string;
    setDashboardAppApi: (api: DashboardApi | undefined) => void;
}
export declare function DashboardApp({ savedDashboardId, embedSettings, redirectTo, history, expandedPanelId, setDashboardAppApi, }: DashboardAppProps): React.JSX.Element;
