import React from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { GroupSettings } from '../../hooks/types';
export interface GroupSelectorProps {
    'data-test-subj'?: string;
    fields: FieldSpec[];
    groupingId: string;
    groupsSelected: string[];
    onGroupChange: (groupSelection: string) => void;
    options: Array<{
        key: string;
        label: string;
    }>;
    title?: string;
    maxGroupingLevels?: number;
    onOpenTracker?: (type: UiCounterMetricType, event: string | string[], count?: number | undefined) => void;
    settings?: GroupSettings;
}
export declare const GroupSelector: React.MemoExoticComponent<({ "data-test-subj": dataTestSubj, fields, groupsSelected, onGroupChange, options, title, maxGroupingLevels, onOpenTracker, settings, }: GroupSelectorProps) => React.JSX.Element>;
