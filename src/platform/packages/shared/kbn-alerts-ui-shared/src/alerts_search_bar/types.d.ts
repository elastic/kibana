import type { Filter } from '@kbn/es-query';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
export type QueryLanguageType = 'lucene' | 'kuery';
export interface AlertsSearchBarProps {
    appName: string;
    disableQueryLanguageSwitcher?: boolean;
    rangeFrom?: string;
    rangeTo?: string;
    query?: string;
    filters?: Filter[];
    showFilterBar?: boolean;
    showDatePicker?: boolean;
    showSubmitButton?: boolean;
    placeholder?: string;
    submitOnBlur?: boolean;
    ruleTypeIds?: string[];
    onQueryChange?: (query: {
        dateRange: {
            from: string;
            to: string;
            mode?: 'absolute' | 'relative';
        };
        query?: string;
    }) => void;
    onQuerySubmit: (query: {
        dateRange: {
            from: string;
            to: string;
            mode?: 'absolute' | 'relative';
        };
        query?: string;
    }) => void;
    onFiltersUpdated?: (filters: Filter[]) => void;
    http: HttpStart;
    toasts: ToastsStart;
    unifiedSearchBar: UnifiedSearchPublicPluginStart['ui']['SearchBar'];
    dataService: DataPublicPluginStart;
    fetchUnifiedAlertsFields?: boolean;
}
