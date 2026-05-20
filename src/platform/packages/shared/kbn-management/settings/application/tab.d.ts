import React from 'react';
export declare const DATA_TEST_SUBJ_PREFIX_TAB = "settings-tab";
/**
 * Props for a {@link Tab} component.
 */
export interface TabProps {
    /** The id of the tab. Used by parent component for differentiating between tabs. */
    id: string;
    /** The name of the tab. */
    name: string;
    /** The `onClick` handler for the tab. */
    onChangeSelectedTab: () => void;
    /** True if the tab is selected, false otherwise. */
    isSelected: boolean;
}
/**
 * Component for rendering a settings tab.
 */
export declare const Tab: ({ id, name, onChangeSelectedTab, isSelected }: TabProps) => React.JSX.Element;
