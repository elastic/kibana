import React from 'react';
export interface DevToolsSettingsModalProps {
    id?: string;
    label: string;
    children: React.ReactNode;
}
export declare const SettingsFormRow: ({ id, label, children }: DevToolsSettingsModalProps) => React.JSX.Element;
