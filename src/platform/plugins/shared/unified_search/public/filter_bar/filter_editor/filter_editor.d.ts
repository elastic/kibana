import { type Filter } from '@kbn/es-query';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { WithEuiThemeProps } from '@elastic/eui/src/services/theme';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
export declare const strings: {
    getPanelTitleAdd: () => string;
    getPanelTitleEdit: () => string;
    getAddButtonLabel: () => string;
    getUpdateButtonLabel: () => string;
    getSelectDataViewToolTip: () => string;
    getCustomLabel: () => string;
    getAddCustomLabel: () => string;
    getSelectDataView: () => string;
    getDataView: () => string;
    getQueryDslLabel: () => string;
    getQueryDslDocsLinkLabel: () => string;
    getQueryDslAriaLabel: () => string;
    getSpatialFilterQueryDslHelpText: () => string;
};
interface QueryDslFilter {
    queryDsl: string;
    customLabel: string | null;
}
export interface FilterEditorComponentProps {
    filter: Filter;
    indexPatterns: DataView[];
    onSubmit: (filter: Filter) => void;
    onCancel: () => void;
    onLocalFilterCreate?: (initialState: {
        filter: Filter;
        queryDslFilter: QueryDslFilter;
    }) => void;
    onLocalFilterUpdate?: (filter: Filter | QueryDslFilter) => void;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    mode?: 'edit' | 'add';
    suggestionsAbstraction?: SuggestionsAbstraction;
    docLinks: DocLinksStart;
    filtersCount?: number;
    dataViews?: DataViewsContract;
}
export type FilterEditorProps = WithEuiThemeProps & FilterEditorComponentProps;
export declare const FilterEditor: React.ForwardRefExoticComponent<Omit<WithEuiThemeProps<{}> & FilterEditorComponentProps, "theme"> & React.RefAttributes<Omit<WithEuiThemeProps<{}> & FilterEditorComponentProps, "theme">>>;
export {};
