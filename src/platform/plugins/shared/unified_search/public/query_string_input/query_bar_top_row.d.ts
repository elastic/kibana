import type { ReactNode } from 'react';
import React from 'react';
import type { Filter, TimeRange, Query, AggregateQuery } from '@kbn/es-query';
import { type ESQLEditorProps } from '@kbn/esql/public';
import type { EuiFieldText, EuiIconProps } from '@elastic/eui';
import type { TimeHistoryContract } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable, ESQLQueryStats } from '@kbn/esql-types';
import type { SuggestionsAbstraction, SuggestionsListSize } from '@kbn/kql/public';
import type { DataViewPickerProps } from '../dataview_picker';
import type { UnifiedSearchDraft } from '../types';
export declare const strings: {
    getNeedsUpdatingLabel: () => string;
    getUpdateButtonLabel: () => string;
    getRefreshQueryLabel: () => string;
    getRefreshButtonLabel: () => string;
    getCancelQueryLabel: () => string;
    getSearchButtonLabel: () => string;
    getDisabledDatePickerLabel: () => string;
    getSendToBackgroundLabel: () => string;
};
export interface QueryBarTopRowProps<QT extends Query | AggregateQuery = Query> {
    customSubmitButton?: any;
    dataViewPickerOverride?: ReactNode;
    dataTestSubj?: string;
    dateRangeFrom?: string;
    dateRangeTo?: string;
    disableAutoFocus?: boolean;
    fillSubmitButton: boolean;
    iconType?: EuiIconProps['type'];
    indexPatterns?: Array<DataView | string>;
    indicateNoData?: boolean;
    isClearable?: boolean;
    isDirty: boolean;
    isLoading?: boolean;
    isRefreshPaused?: boolean;
    nonKqlMode?: 'lucene' | 'text';
    onChange: (payload: {
        dateRange: TimeRange;
        query?: Query | QT;
    }) => void;
    onRefresh?: (payload: {
        dateRange: TimeRange;
    }) => void;
    onRefreshChange?: (options: {
        isPaused: boolean;
        refreshInterval: number;
    }) => void;
    onSubmit: (payload: {
        dateRange: TimeRange;
        query?: Query | QT;
    }) => void;
    onSendToBackground: (payload: {
        dateRange: TimeRange;
        query?: Query | QT;
    }) => Promise<void>;
    onCancel?: () => void;
    onDraftChange?: (draft: UnifiedSearchDraft | undefined) => void;
    placeholder?: string;
    prepend?: React.ComponentProps<typeof EuiFieldText>['prepend'];
    query?: Query | QT;
    refreshInterval?: number;
    minRefreshInterval?: number;
    screenTitle?: string;
    showQueryInput?: boolean;
    showAddFilter?: boolean;
    showDatePicker?: boolean;
    isDisabled?: boolean;
    showAutoRefreshOnly?: boolean;
    timeHistory?: TimeHistoryContract;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    filters?: Filter[];
    onFiltersUpdated?: (filters: Filter[]) => void;
    dataViewPickerComponentProps?: DataViewPickerProps;
    textBasedLanguageModeErrors?: Error[];
    textBasedLanguageModeWarning?: string;
    filterBar?: React.ReactNode;
    showDatePickerAsBadge?: boolean;
    showSubmitButton?: boolean;
    /**
     * Style of the submit button
     * `iconOnly` - use IconButton
     * `full` - use SuperUpdateButton
     * (default) `auto` - `iconOnly` on smaller screens, and `full` on larger screens
     */
    submitButtonStyle?: 'auto' | 'iconOnly' | 'full';
    suggestionsSize?: SuggestionsListSize;
    suggestionsAbstraction?: SuggestionsAbstraction;
    isScreenshotMode?: boolean;
    onTextLangQuerySubmit: (query?: Query | AggregateQuery) => void;
    onTextLangQueryChange: (query: AggregateQuery) => void;
    submitOnBlur?: boolean;
    renderQueryInputAppend?: () => React.ReactNode;
    disableExternalPadding?: boolean;
    bubbleSubmitEvent?: boolean;
    esqlEditorInitialState?: ESQLEditorProps['initialState'];
    onEsqlEditorInitialStateChange?: ESQLEditorProps['onInitialStateChange'];
    /**
     * Optional configuration for ES|QL variables.
     *
     * This prop allows you to define and manage variables used within ES|QL queries,
     * typically bound to UI controls like dropdowns or input fields (Dashboard controls).
     */
    esqlVariablesConfig?: {
        /**
         * An array of control variables, each defining a key, an initial value,
         * and its data type, which are used to parameterize the ES|QL query.
         */
        esqlVariables: ESQLControlVariable[];
        /**
         * Callback function invoked when control changes are to be saved.
         * It receives the current state of the UI controls and the updated ES|QL query string.
         * @param controlState - A record containing the current values of the UI controls.
         * @param updatedQuery - The ES|QL query string updated with the new variable values.
         */
        onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
        /**
         * Callback function invoked when the user cancels changes to the controls.
         * This function reverts the UI to its previous state or closes a modal.
         */
        onCancelControl?: () => void;
        /**
         * A React Node that will be rendered as a wrapper for the UI controls
         * associated with the ES|QL variables. This allows for custom layout or
         * additional elements around the controls.
         */
        controlsWrapper: React.ReactNode;
    };
    /**
     * Optional ES|QL prop - Request statistics to be displayed in the ES|QL editor UI
     */
    esqlQueryStats?: ESQLQueryStats;
    /**
     * Optional ES|QL prop - Callback function invoked to open the given ES|QL query in a new Discover tab
     */
    onOpenQueryInNewTab?: ESQLEditorProps['onOpenQueryInNewTab'];
    onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
    /**
     * Optional ES|QL prop - Enable data source browser in ESQL editor
     */
    enableResourceBrowser?: ESQLEditorProps['enableResourceBrowser'];
    useBackgroundSearchButton?: boolean;
    /**
     * Opt-in to the new DateRangePicker. The new picker is shown only when both
     * this prop is `true` and the `unifiedSearch.newDateRangePickerEnabled` feature
     * flag is enabled. When the feature flag is disabled, the legacy
     * EuiSuperDatePicker is always used regardless of this prop.
     */
    enableDateRangePicker?: boolean;
}
export declare const SharingMetaFields: React.NamedExoticComponent<{
    from: string;
    to: string;
    dateFormat: string;
}>;
type GenericQueryBarTopRow = <QT extends AggregateQuery | Query = Query>(props: QueryBarTopRowProps<QT>) => React.ReactElement;
export declare const QueryBarTopRow: GenericQueryBarTopRow;
export {};
