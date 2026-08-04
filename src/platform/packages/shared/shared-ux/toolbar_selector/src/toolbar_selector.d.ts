import type { ReactElement } from 'react';
import React from 'react';
import type { EuiSelectableProps, EuiSelectableOption } from '@elastic/eui';
export declare const EMPTY_OPTION = "__EMPTY_SELECTOR_OPTION__";
export type SelectableEntry = EuiSelectableOption<{
    value: string;
}>;
export interface BaseToolbarProps {
    'data-test-subj': string;
    'data-selected-value'?: string | string[];
    buttonLabel: ReactElement | string;
    buttonTooltipContent?: ReactElement | string;
    popoverContentBelowSearch?: ReactElement;
    popoverTitle?: string;
    options: SelectableEntry[];
    searchable: boolean;
    optionMatcher?: EuiSelectableProps['optionMatcher'];
    hasArrow?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
}
export interface ToolbarSingleSelectorProps {
    singleSelection?: true;
    onChange?: (c?: SelectableEntry) => void;
}
export interface ToolbarMultiSelectorProps {
    singleSelection: false;
    onChange?: (c?: SelectableEntry[]) => void;
}
export type ToolbarSelectorProps = BaseToolbarProps & (ToolbarSingleSelectorProps | ToolbarMultiSelectorProps);
export declare const ToolbarSelector: ({ "data-test-subj": dataTestSubj, "data-selected-value": dataSelectedValue, buttonLabel, buttonTooltipContent, popoverContentBelowSearch, popoverTitle, options, searchable, optionMatcher, onChange, singleSelection, hasArrow, disabled, fullWidth, }: ToolbarSelectorProps) => React.JSX.Element;
