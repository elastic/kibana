import React from 'react';
export interface DashboardPickerProps {
    onChange: (dashboard: {
        name: string;
        id: string;
    } | null) => void;
    isDisabled: boolean;
    idsToOmit?: string[];
}
export declare function DashboardPicker({ isDisabled, onChange, idsToOmit }: DashboardPickerProps): React.JSX.Element;
export default DashboardPicker;
