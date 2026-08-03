import React from 'react';
import type { ReactNode } from 'react';
export interface ContentListEmptyStatePrimaryAction {
    label: ReactNode;
    onClick: () => void;
    iconType?: string;
    disabled?: boolean;
    'data-test-subj'?: string;
}
export interface ContentListEmptyStateProps {
    iconType?: string;
    title?: ReactNode;
    body?: ReactNode;
    primaryAction?: ContentListEmptyStatePrimaryAction;
    secondaryAction?: ReactNode;
    'data-test-subj'?: string;
}
/**
 * Provider-aware empty state component for Content List.
 *
 * `<ContentList>` uses this component as its default empty rendering. Pass it
 * as `emptyState` when you need custom copy or actions.
 */
export declare const ContentListEmptyState: ({ iconType, title, body, primaryAction, secondaryAction, "data-test-subj": dataTestSubj, }: ContentListEmptyStateProps) => React.JSX.Element | null;
