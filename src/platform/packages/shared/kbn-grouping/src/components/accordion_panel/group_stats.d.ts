import React from 'react';
import type { GroupStatsItem } from '../types';
type GetActionItems = (args: {
    closePopover: () => void;
}) => JSX.Element | undefined;
interface GroupStatsProps<T> {
    bucketKey: string;
    onTakeActionsOpen?: () => void;
    stats?: GroupStatsItem[];
    getActionItems?: GetActionItems;
    /** Optional array of additional action buttons to display before the Take actions button */
    additionalActionButtons?: React.ReactElement[];
}
export declare const GroupStats: React.MemoExoticComponent<(<T>({ bucketKey, onTakeActionsOpen, stats, getActionItems, additionalActionButtons, }: GroupStatsProps<T>) => React.JSX.Element)>;
export {};
