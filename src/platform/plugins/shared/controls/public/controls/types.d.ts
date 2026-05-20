import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DSLOptionsListComponentApi } from './data_controls/options_list_control/types';
import type { ESQLOptionsListComponentApi } from './esql_control/types';
import type { OptionsListSuggestions } from '../../common/options_list';
export interface HasCustomPrepend {
    CustomPrependComponent: React.FC<{}>;
}
/**
 * These types are shared between normal options list controls and ES|QL controls
 */
export type OptionsListComponentApi = DSLOptionsListComponentApi | ESQLOptionsListComponentApi;
export interface OptionsListSelectionsApi {
    makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
    deselectOption: (key: string | undefined) => void;
    selectAll: (keys: string[]) => void;
    deselectAll: (keys: string[]) => void;
}
export interface OptionsListPublishesOptions<SelectionType> {
    availableOptions$: PublishingSubject<OptionsListSuggestions<SelectionType>>;
    invalidSelections$: PublishingSubject<Set<SelectionType>>;
    totalCardinality$: PublishingSubject<number>;
}
