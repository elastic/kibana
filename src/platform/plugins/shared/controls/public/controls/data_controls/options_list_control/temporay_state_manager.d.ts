import type { OptionsListSuggestions } from '../../../../common/options_list';
export interface TemporaryState<SelectionType> {
    searchString: string;
    searchStringValid: boolean;
    requestSize: number;
    dataLoading: boolean | undefined;
    availableOptions: OptionsListSuggestions<SelectionType>;
    invalidSelections: Set<SelectionType>;
    totalCardinality: number;
}
export declare const initializeTemporayStateManager: <SelectionType>() => import("@kbn/presentation-publishing/state_manager/types").StateManager<TemporaryState<SelectionType>>;
