import React, { PureComponent } from 'react';
import type { EuiIconProps, PopoverAnchorPosition } from '@elastic/eui';
import type { CoreStart, DocLinksStart } from '@kbn/core/public';
import type { Query, Filter } from '@kbn/es-query';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { type DataView } from '@kbn/data-views-plugin/public';
import type { PersistedLog, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { type DataViewByIdOrTitle } from './fetch_index_patterns';
import type { SuggestionsAbstraction, SuggestionsListSize } from '../typeahead/suggestions_component';
import type { AutocompleteService, QuerySuggestion } from '../../autocomplete';
export declare const strings: {
    getSearchInputPlaceholderForText: () => string;
    getSearchInputPlaceholder: (language: string) => string;
    getQueryBarComboboxAriaLabel: (pageType: string) => string;
    getQueryBarSearchInputAriaLabel: (pageType: string) => string;
    getQueryBarClearInputLabel: () => string;
    getKQLNestedQuerySyntaxInfoTitle: () => string;
};
export interface QueryStringInputDependencies {
    autocomplete: ReturnType<AutocompleteService['start']>;
    usageCollection?: UsageCollectionStart;
    data: DataPublicPluginStart;
    storage: IStorageWrapper;
    notifications: CoreStart['notifications'];
    http: CoreStart['http'];
    docLinks: DocLinksStart;
    uiSettings: CoreStart['uiSettings'];
    dataViews: DataViewsPublicPluginStart;
}
export interface QueryStringInputProps {
    indexPatterns: Array<DataView | string | DataViewByIdOrTitle>;
    query: Query;
    disableAutoFocus?: boolean;
    screenTitle?: string;
    prepend?: any;
    persistedLog?: PersistedLog;
    bubbleSubmitEvent?: boolean;
    placeholder?: string;
    disableLanguageSwitcher?: boolean;
    languageSwitcherPopoverAnchorPosition?: PopoverAnchorPosition;
    onBlur?: () => void;
    onChange?: (query: Query) => void;
    onChangeQueryInputFocus?: (isFocused: boolean) => void;
    onSubmit?: (query: Query) => void;
    submitOnBlur?: boolean;
    dataTestSubj?: string;
    size?: SuggestionsListSize;
    suggestionsAbstraction?: SuggestionsAbstraction;
    className?: string;
    isInvalid?: boolean;
    isClearable?: boolean;
    iconType?: EuiIconProps['type'];
    isDisabled?: boolean;
    appName: string;
    deps: QueryStringInputDependencies;
    /**
     * @param nonKqlMode by default if language switch is enabled, user can switch between kql and lucene syntax mode
     * this params add another option text, which is just a  simple keyword search mode, the way a simple search box works
     */
    nonKqlMode?: 'lucene' | 'text';
    /**
     * @param autoSubmit if user selects a value, in that case kuery will be auto submitted
     */
    autoSubmit?: boolean;
    /**
     * @param storageKey this key is used to use user preference between kql and non-kql mode
     */
    storageKey?: string;
    /**
     * Override whether autocomplete suggestions are restricted by time range.
     */
    timeRangeForSuggestionsOverride?: boolean;
    /**
     * Add additional filters used for suggestions
     */
    filtersForSuggestions?: Filter[];
    /**
     * Debounce delay in ms for fetching suggestions. Defaults to 100.
     */
    suggestionsDebounceMs?: number;
}
interface State {
    isSuggestionsVisible: boolean;
    index: number | null;
    suggestions: QuerySuggestion[];
    suggestionLimit: number;
    selectionStart: number | null;
    selectionEnd: number | null;
    indexPatterns: DataView[];
    /**
     * Part of state because passed down to child components
     */
    queryBarInputDiv: HTMLDivElement | null;
}
export declare class QueryStringInput extends PureComponent<QueryStringInputProps, State> {
    static defaultProps: {
        storageKey: string;
        iconType: string;
        isClearable: boolean;
    };
    state: State;
    inputRef: HTMLTextAreaElement | null;
    private persistedLog;
    private abortController?;
    private fetchIndexPatternsAbortController?;
    private reportUiCounter;
    private componentIsUnmounting;
    private hasScrollListener;
    /**
     * If any element within the container is currently focused
     * @internal
     */
    private isFocusWithin;
    private getQueryString;
    private fetchIndexPatterns;
    private getSuggestions;
    private getRecentSearchSuggestions;
    private updateSuggestions;
    private onSubmit;
    private onChange;
    private onQueryStringChange;
    private onInputChange;
    private onClickInput;
    private onKeyUp;
    private onKeyDown;
    private selectSuggestion;
    private handleNestedFieldSyntaxNotification;
    private increaseLimit;
    private incrementIndex;
    private decrementIndex;
    private onSelectLanguage;
    private onOutsideClick;
    private blurTimeoutHandle;
    /**
     * Notify parent about input's blur after a delay only
     * if the focus didn't get back inside the input container
     * and if suggestions were closed
     * https://github.com/elastic/kibana/issues/92040
     */
    private scheduleOnInputBlur;
    private onInputBlur;
    private handleResize;
    private onClickSuggestion;
    private initPersistedLog;
    onMouseEnterSuggestion: (_suggestion: QuerySuggestion, index: number) => void;
    textareaId: string;
    componentDidMount(): void;
    componentDidUpdate(prevProps: QueryStringInputProps): void;
    componentWillUnmount(): void;
    handleAutoHeight: (...args: unknown[]) => void;
    handleBlurOnScroll: (...args: unknown[]) => void;
    handleRemoveHeight: (...args: unknown[]) => void;
    handleBlurHeight: (...args: unknown[]) => void;
    handleOnFocus: () => void;
    getSearchInputPlaceholder: () => string;
    render(): React.JSX.Element;
    /**
     * Used to apply any string formatting to textarea value before converting it to {@link Query} and emitting it to the parent.
     * This is a bit lower level then {@link fromUser} and needed to address any cross-browser inconsistencies where
     * {@link forwardNewValueIfNeeded} should be kept in mind
     */
    private formatTextAreaValue;
    /**
     * When passing a "value" prop into a textarea,
     * check first if value has changed because of {@link formatTextAreaValue},
     * if this is just a formatting change, then skip this update by re-using current textarea value.
     * This is needed to avoid re-rendering to preserve focus and selection
     * @internal
     */
    private forwardNewValueIfNeeded;
    private assignInputRef;
    private assignQueryInputDivRef;
    private onFocusWithin;
    private onBlurWithin;
}
export {};
