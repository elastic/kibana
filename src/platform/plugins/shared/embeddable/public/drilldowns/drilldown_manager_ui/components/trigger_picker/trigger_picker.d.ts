import React from 'react';
import type { TriggerPickerItemDescription } from './trigger_picker_item';
export interface TriggerPickerProps {
    /** List of available triggers. */
    items: TriggerPickerItemDescription[];
    /** selected trigger. */
    selected?: string;
    /** Link to documentation. */
    docs?: string;
    /** Whether user interactions should be disabled. */
    disabled?: boolean;
    /** Called on trigger selection change. */
    onChange: (selected: string) => void;
}
export declare const TriggerPicker: React.FC<TriggerPickerProps>;
