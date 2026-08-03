import React from 'react';
export interface DrilldownTableItem {
    id: string;
    actionName: string;
    drilldownName: string;
    icon?: string;
    error?: string;
    trigger?: Trigger;
    triggerIncompatible?: boolean;
}
interface Trigger {
    title?: string;
    description?: string;
}
export declare const TEST_SUBJ_DRILLDOWN_ITEM = "listManageDrilldownsItem";
export interface DrilldownTableProps {
    items: DrilldownTableItem[];
    onCreate?: () => void;
    onDelete?: (ids: string[]) => void;
    onEdit?: (id: string) => void;
    onCopy?: (id: string) => void;
}
export declare const DrilldownTable: React.FC<DrilldownTableProps>;
export {};
