import React from 'react';
export interface ProjectPickerFilterFormProps {
    /**
     * When set, saving updates the existing filter instead of creating a new one.
     */
    filterId?: string;
    /**
     * Callback to be called when the filter form should be closed.
     */
    onCloseFilterFormRequested?: () => void;
}
export declare function ProjectPickerFilterForm({ filterId, onCloseFilterFormRequested, }: ProjectPickerFilterFormProps): React.JSX.Element;
