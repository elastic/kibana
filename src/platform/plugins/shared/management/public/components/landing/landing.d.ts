import React from 'react';
interface ManagementLandingPageProps {
    onAppMounted: (id: string) => void;
    setBreadcrumbs: () => void;
}
export declare const ManagementLandingPage: ({ setBreadcrumbs, onAppMounted, }: ManagementLandingPageProps) => React.JSX.Element | null;
export {};
