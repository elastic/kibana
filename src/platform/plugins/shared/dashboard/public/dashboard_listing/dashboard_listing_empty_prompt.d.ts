import React from 'react';
import type { DashboardListingProps } from './types';
export interface DashboardListingEmptyPromptProps {
    createItem: () => void;
    disableCreateDashboardButton?: boolean;
    unsavedDashboardIds: string[];
    goToDashboard: DashboardListingProps['goToDashboard'];
    setUnsavedDashboardIds: React.Dispatch<React.SetStateAction<string[]>>;
    useSessionStorageIntegration: DashboardListingProps['useSessionStorageIntegration'];
}
export declare const DashboardListingEmptyPrompt: ({ useSessionStorageIntegration, setUnsavedDashboardIds, unsavedDashboardIds, goToDashboard, createItem, disableCreateDashboardButton, }: DashboardListingEmptyPromptProps) => React.JSX.Element;
