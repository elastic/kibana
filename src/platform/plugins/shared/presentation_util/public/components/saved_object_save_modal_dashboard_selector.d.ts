import React from 'react';
import type { DashboardPickerProps } from './dashboard_picker/dashboard_picker';
export interface SaveModalDashboardSelectorProps {
    copyOnSave: boolean;
    documentId?: string;
    onSelectDashboard: DashboardPickerProps['onChange'];
    canSaveByReference: boolean;
    showAddToLibraryCheckbox?: boolean;
    setAddToLibrary: (selected: boolean) => void;
    isAddToLibrarySelected: boolean;
    dashboardOption: 'new' | 'existing' | null;
    onChange: (dashboardOption: 'new' | 'existing' | null) => void;
    hasAttemptedSubmit: boolean;
    hasSelectedDashboard: boolean;
}
export declare function SaveModalDashboardSelector(props: SaveModalDashboardSelectorProps): React.JSX.Element;
