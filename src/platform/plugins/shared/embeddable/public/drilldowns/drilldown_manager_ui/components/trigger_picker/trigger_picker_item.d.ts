import React from 'react';
export interface TriggerPickerItemDescription {
    id: string;
    title?: string;
    description?: string;
}
export interface TriggerPickerItemProps extends TriggerPickerItemDescription {
    /** Whether the item is selected. */
    checked?: boolean;
    /** Whether to disable user interaction. */
    disabled?: boolean;
    /** Called when item is selected by user. */
    onSelect: (id: string) => void;
}
export declare const TriggerPickerItem: React.FC<TriggerPickerItemProps>;
