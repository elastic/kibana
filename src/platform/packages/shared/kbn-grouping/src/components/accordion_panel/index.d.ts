import React from 'react';
import type { GroupChildComponentRenderer, GroupingBucket } from '../types';
interface GroupPanelProps<T> {
    customAccordionButtonClassName?: string;
    customAccordionClassName?: string;
    extraAction?: React.ReactNode;
    forceState?: 'open' | 'closed';
    groupBucket: GroupingBucket<T>;
    groupPanel?: JSX.Element;
    groupingLevel?: number;
    isLoading: boolean;
    isNullGroup?: boolean;
    nullGroupMessage?: string;
    onGroupClose: () => void;
    onToggleGroup?: (isOpen: boolean, groupBucket: GroupingBucket<T>) => void;
    renderChildComponent: GroupChildComponentRenderer<T>;
    selectedGroup: string;
    multiValueFields?: string[];
}
declare const GroupPanelComponent: <T>({ customAccordionButtonClassName, customAccordionClassName, extraAction, forceState, groupBucket, groupPanel, groupingLevel, isLoading, isNullGroup, onGroupClose, onToggleGroup, renderChildComponent, selectedGroup, nullGroupMessage, multiValueFields, }: GroupPanelProps<T>) => React.JSX.Element | null;
export declare const GroupPanel: typeof GroupPanelComponent;
export {};
