import type { InjectedIntl } from '@kbn/i18n-react';
import React, { Component } from 'react';
import type { EuiIconProps, WithEuiThemeProps } from '@elastic/eui';
import { type Query, type Filter, type TimeRange, type AggregateQuery } from '@kbn/es-query';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { TimeHistoryContract, SavedQuery } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESQLQueryStats } from '@kbn/esql-types';
import type { SuggestionsAbstraction, SuggestionsListSize } from '@kbn/kql/public';
import type { AdditionalQueryBarMenuItems } from '../query_string_input/query_bar_menu_panels';
import type { IUnifiedSearchPluginServices, UnifiedSearchDraft } from '../types';
import type { SavedQueryMeta } from '../saved_query_form';
import type { QueryBarMenuProps } from '../query_string_input/query_bar_menu';
import type { DataViewPickerProps } from '../dataview_picker';
import type { QueryBarTopRowProps } from '../query_string_input/query_bar_top_row';
export interface SearchBarInjectedDeps {
    kibana: KibanaReactContextValue<IUnifiedSearchPluginServices>;
    intl: InjectedIntl;
    timeHistory?: TimeHistoryContract;
    onFiltersUpdated?: (filters: Filter[]) => void;
    onRefreshChange?: (options: {
        isPaused: boolean;
        refreshInterval: number;
    }) => void;
    bubbleSubmitEvent?: boolean;
}
export interface SearchBarOwnProps<QT extends AggregateQuery | Query = Query> {
    indexPatterns?: DataView[];
    isLoading?: boolean;
    customSubmitButton?: React.ReactNode;
    dataViewPickerOverride?: React.ReactNode;
    screenTitle?: string;
    dataTestSubj?: string;
    showQueryMenu?: boolean;
    showQueryInput?: boolean;
    showFilterBar?: boolean;
    showDatePicker?: boolean;
    showAutoRefreshOnly?: boolean;
    /**
     * Opt-in to the new DateRangePicker. Only takes effect when the
     * `unifiedSearch.newDateRangePickerEnabled` feature flag is also enabled.
     */
    enableDateRangePicker?: boolean;
    filters?: Filter[];
    additionalQueryBarMenuItems?: AdditionalQueryBarMenuItems;
    filtersForSuggestions?: Filter[];
    hiddenFilterPanelOptions?: QueryBarMenuProps['hiddenPanelOptions'];
    prependFilterBar?: React.ReactNode;
    isRefreshPaused?: boolean;
    refreshInterval?: number;
    minRefreshInterval?: number;
    dateRangeFrom?: string;
    dateRangeTo?: string;
    query?: QT | Query;
    showSaveQuery?: boolean;
    showSavedQueryControls?: boolean;
    savedQuery?: SavedQuery;
    onQueryChange?: (payload: {
        dateRange: TimeRange;
        query?: QT | Query;
    }) => void;
    onQuerySubmit?: (payload: {
        dateRange: TimeRange;
        query?: QT | Query;
    }, isUpdate?: boolean) => void;
    draft?: UnifiedSearchDraft;
    onDraftChange?: QueryBarTopRowProps<QT>['onDraftChange'];
    onSaved?: (savedQuery: SavedQuery) => void;
    onSavedQueryUpdated?: (savedQuery: SavedQuery) => void;
    onTimeRangeChange?: (payload: {
        dateRange: TimeRange;
    }) => void;
    onClearSavedQuery?: () => void;
    onRefresh?: (payload: {
        dateRange: TimeRange;
    }) => void;
    onCancel?: () => void;
    onRefreshChange?: (options: {
        isPaused: boolean;
        refreshInterval: number;
    }) => void;
    indicateNoData?: boolean;
    isAutoRefreshDisabled?: boolean;
    placeholder?: string;
    isClearable?: boolean;
    iconType?: EuiIconProps['type'];
    nonKqlMode?: 'lucene' | 'text';
    disableQueryLanguageSwitcher?: boolean;
    displayStyle?: 'inPage' | 'detached' | 'withBorders';
    fillSubmitButton?: boolean;
    dataViewPickerComponentProps?: DataViewPickerProps;
    textBasedLanguageModeErrors?: Error[];
    textBasedLanguageModeWarning?: string;
    showSubmitButton?: boolean;
    submitButtonStyle?: QueryBarTopRowProps['submitButtonStyle'];
    suggestionsSize?: SuggestionsListSize;
    suggestionsAbstraction?: SuggestionsAbstraction;
    isScreenshotMode?: boolean;
    /**
     * Disables all inputs and interactive elements,
     */
    isDisabled?: boolean;
    submitOnBlur?: boolean;
    renderQueryInputAppend?: () => React.ReactNode;
    onESQLDocsFlyoutVisibilityChanged?: QueryBarTopRowProps['onESQLDocsFlyoutVisibilityChanged'];
    /**
     * Optional configuration for ES|QL variables.
     *
     * This prop allows you to define and manage variables used within ES|QL queries,
     * typically bound to UI controls like dropdowns or input fields (Dashboard controls here).
     */
    esqlVariablesConfig?: QueryBarTopRowProps['esqlVariablesConfig'];
    esqlQueryStats?: ESQLQueryStats;
    /** Optional configurations for the lookup join index editor */
    onOpenQueryInNewTab?: QueryBarTopRowProps['onOpenQueryInNewTab'];
    esqlEditorInitialState?: QueryBarTopRowProps['esqlEditorInitialState'];
    onEsqlEditorInitialStateChange?: QueryBarTopRowProps['onEsqlEditorInitialStateChange'];
    hasDirtyState?: boolean;
    useBackgroundSearchButton?: boolean;
    /**
     * Enable data source browser suggestion in ES|QL editor.
     */
    enableResourceBrowser?: boolean;
}
export type SearchBarProps<QT extends Query | AggregateQuery = Query> = SearchBarOwnProps<QT> & SearchBarInjectedDeps;
export interface SearchBarState<QT extends Query | AggregateQuery = Query> {
    isFiltersVisible: boolean;
    openQueryBarMenu: boolean;
    showSavedQueryPopover: boolean;
    currentProps?: SearchBarProps;
    query?: QT | Query;
    dateRangeFrom: string;
    dateRangeTo: string;
}
export declare class SearchBarUI<QT extends (Query | AggregateQuery) | Query = Query> extends Component<SearchBarProps<QT> & WithEuiThemeProps, SearchBarState<QT | Query>> {
    static defaultProps: {
        showQueryMenu: boolean;
        showFilterBar: boolean;
        showDatePicker: boolean;
        showSubmitButton: boolean;
        showAutoRefreshOnly: boolean;
        filtersForSuggestions: never[];
        additionalQueryBarMenuItems: never[];
    };
    private services;
    private savedQueryService;
    private queryBarMenuRef;
    static getDerivedStateFromProps(nextProps: SearchBarProps, prevState: SearchBarState<AggregateQuery | Query>): any;
    private prefillWithInitialDraftState;
    state: SearchBarState<QT>;
    isDirty: () => boolean;
    private onDraftChange;
    componentWillUnmount(): void;
    private shouldRenderTimeFilterInSavedQueryForm;
    private getTimeFilter;
    onSave: (savedQueryMeta: SavedQueryMeta, saveAsNew?: boolean) => Promise<void>;
    onQueryBarChange: (queryAndDateRange: {
        dateRange: TimeRange;
        query?: QT | Query;
    }) => void;
    onTextLangQueryChange: (query?: any) => void;
    toggleFilterBarMenuPopover: (value: boolean) => void;
    onTextLangQuerySubmit: (query?: Query | AggregateQuery) => void;
    onQueryBarSubmit: (queryAndDateRange: {
        dateRange?: TimeRange;
        query?: QT | Query;
    }) => void;
    onLoadSavedQuery: (savedQuery: SavedQuery) => void;
    private showBackgroundSearchCreatedToast;
    private onBackgroundSearch;
    private shouldShowDatePickerAsBadge;
    render(): React.JSX.Element;
    private renderSavedQueryManagement;
}
declare const _default: React.FC<import("react-intl").WithIntlProps<Omit<Omit<SearchBarOwnProps<Query | AggregateQuery> & SearchBarInjectedDeps & WithEuiThemeProps<{}>, "kibana">, "theme"> & React.RefAttributes<Omit<Omit<SearchBarOwnProps<Query | AggregateQuery> & SearchBarInjectedDeps & WithEuiThemeProps<{}>, "kibana">, "theme">>>> & {
    WrappedComponent: React.ComponentType<Omit<Omit<SearchBarOwnProps<Query | AggregateQuery> & SearchBarInjectedDeps & WithEuiThemeProps<{}>, "kibana">, "theme"> & React.RefAttributes<Omit<Omit<SearchBarOwnProps<Query | AggregateQuery> & SearchBarInjectedDeps & WithEuiThemeProps<{}>, "kibana">, "theme">>>;
};
export default _default;
