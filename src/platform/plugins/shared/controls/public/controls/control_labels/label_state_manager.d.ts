import type { DataControlState } from '@kbn/controls-schemas';
import { type PublishingSubject, type SerializedTitles, type StateComparators } from '@kbn/presentation-publishing';
import type { StateManager, SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';
/**
 * Controls handle their own label rendering, so we cannot rely on the normal titles manager because
 * the other properties (description, hide title, default title, etc.) are not applicable for controls.
 */
export declare const defaultControlLabelComparators: StateComparators<Pick<DataControlState, 'title'>>;
type PickStringsOnly<T> = {
    [K in keyof T as T[K] extends string ? K : never]: T[K];
};
type ControlTitleState = Pick<SerializedTitles, 'title'>;
export declare const initializeLabelManager: <StateType extends ControlTitleState = ControlTitleState>(state: StateType, api: SubjectsOf<Omit<StateType, "title">>, defaultLabelKey: keyof Required<Omit<PickStringsOnly<StateType>, "title">>) => StateManager<ControlTitleState> & {
    api: StateManager<ControlTitleState>["api"] & {
        defaultTitle$: PublishingSubject<string | undefined>;
        hideTitle$: PublishingSubject<boolean | undefined>;
        label$: PublishingSubject<string>;
    };
    cleanup: () => void;
};
export {};
