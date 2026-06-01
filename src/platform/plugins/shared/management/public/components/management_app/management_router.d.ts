import React from 'react';
import type { AnalyticsServiceStart, AppMountParameters, ChromeBreadcrumb, ScopedHistory, ThemeServiceStart } from '@kbn/core/public';
import type { ManagementSection } from '../../utils';
interface ManagementRouterProps {
    history: AppMountParameters['history'];
    theme: ThemeServiceStart;
    setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void;
    onAppMounted: (id: string) => void;
    sections: ManagementSection[];
    analytics: AnalyticsServiceStart;
}
export declare const ManagementRouter: React.MemoExoticComponent<({ history, setBreadcrumbs, onAppMounted, sections, theme, analytics, }: ManagementRouterProps) => React.JSX.Element>;
export {};
