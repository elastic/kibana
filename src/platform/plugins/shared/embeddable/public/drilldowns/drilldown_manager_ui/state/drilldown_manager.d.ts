import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { DrilldownState } from '../../../../server/drilldowns/types';
import type { DrilldownFactory } from '../types';
export interface DrilldownManagerDeps {
    /**
     * Drilldown factory.
     */
    factory: DrilldownFactory;
    /**
     * List of all triggers provided by the place from where the
     * Drilldown Manager was opened.
     */
    triggers: string[];
    /**
     * Initial drilldown state.
     */
    initialState?: Partial<DrilldownState>;
}
/**
 * An instance of this class represents UI states of a single drilldown which
 * is currently being created or edited.
 */
export declare class DrilldownManager {
    /**
     * Drilldown definition.
     */
    readonly factory: DrilldownFactory;
    /**
     * User entered drilldown state.
     */
    readonly state$: BehaviorSubject<Partial<DrilldownState>>;
    /**
     * List of all triggers from which the user can pick in UI for this specific
     * drilldown. This is the selection list we show to the user. It is an
     * intersection of all triggers supported by current place with the triggers
     * that the action factory supports.
     */
    readonly uiTriggers: string[];
    /**
     * Whether the drilldown state is in an error and should not be saved. Value
     * is `undefined` when there is no error.
     */
    readonly error$: Observable<string | undefined>;
    constructor({ factory, triggers, initialState, }: DrilldownManagerDeps);
    /**
     * Set drilldown label.
     */
    readonly setLabel: (label: string) => void;
    /**
     * Change the selected trigger.
     */
    readonly setTrigger: (trigger: string) => void;
    /**
     * Update the current drilldown configuration.
     */
    readonly setState: (state: Partial<DrilldownState>) => void;
    /**
     * Serialize the current drilldown draft into a serializable action which
     * is persisted to disk.
     */
    serialize(): DrilldownState;
    isValid(): boolean;
    readonly useState: () => Partial<DrilldownState>;
    readonly useError: () => string | undefined;
}
