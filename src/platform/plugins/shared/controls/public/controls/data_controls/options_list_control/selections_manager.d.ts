import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing';
export declare const selectionComparators: StateComparators<Pick<OptionsListDSLControlState, 'exclude' | 'exists_selected' | 'selected_options' | 'sort'>>;
export declare const defaultSelectionState: {
    exclude: false;
    exists_selected: false;
    selected_options: (string | number)[];
    sort: {
        readonly by: "_count";
        readonly direction: "desc";
    };
};
export type SelectionsState = Pick<OptionsListDSLControlState, 'exclude' | 'exists_selected' | 'selected_options' | 'sort'>;
export declare function initializeSelectionsManager(initialState: SelectionsState): {
    internalApi: {
        hasInitialSelections: boolean;
    };
    getLatestState: () => import("@kbn/presentation-publishing").WithAllKeys<SelectionsState>;
    reinitializeState: (newState?: Partial<SelectionsState> | undefined, comparators?: StateComparators<SelectionsState> | undefined) => void;
    api: import("@kbn/presentation-publishing/state_manager/types").SettersOf<SelectionsState> & import("@kbn/presentation-publishing/state_manager/types").SubjectsOf<SelectionsState>;
    anyStateChange$: import("rxjs").Observable<void>;
};
