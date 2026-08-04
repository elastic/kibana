import React from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { WithCloseFilterEditorConfirmModalProps } from '../filter_bar/filter_editor';
export declare const strings: {
    getAddFilterButtonLabel: () => string;
};
interface AddFilterPopoverProps extends WithCloseFilterEditorConfirmModalProps {
    indexPatterns?: Array<DataView | string>;
    filters: Filter[];
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    onFiltersUpdated?: (filters: Filter[]) => void;
    isDisabled?: boolean;
    buttonProps?: Partial<EuiButtonIconProps>;
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export declare const AddFilterPopover: (props: Omit<AddFilterPopoverProps, keyof WithCloseFilterEditorConfirmModalProps>) => React.JSX.Element;
export {};
