import React from 'react';
export interface DrilldownTemplateTableItem {
    id: string;
    name: string;
    description?: string;
    actionName?: string;
    actionIcon?: string;
    trigger?: string;
    triggerIncompatible?: boolean;
}
export interface DrilldownTemplateTableProps {
    items: DrilldownTemplateTableItem[];
    onCreate?: (id: string) => void;
    onClone?: (ids: string[]) => void;
}
export declare const DrilldownTemplateTable: React.FC<DrilldownTemplateTableProps>;
