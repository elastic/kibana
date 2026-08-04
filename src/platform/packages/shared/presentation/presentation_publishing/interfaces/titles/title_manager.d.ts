import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
import type { StateComparators, StateManager } from '../../state_manager/types';
import type { PublishesWritableDescription } from './publishes_description';
import type { PublishesWritableTitle } from './publishes_title';
import type { PublishesWritableHideBorder } from './publishes_hide_border';
export type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
export type TitleManager = {
    api: PublishesWritableTitle & PublishesWritableDescription & PublishesWritableHideBorder;
} & Pick<StateManager<SerializedTitles>, 'anyStateChange$' | 'getLatestState' | 'reinitializeState'>;
export declare const titleComparators: StateComparators<SerializedTitles>;
export declare const stateHasTitles: (state: unknown) => state is SerializedTitles;
export interface TitlesApi extends PublishesWritableTitle, PublishesWritableDescription, PublishesWritableHideBorder {
}
export declare const initializeTitleManager: (initialTitlesState: SerializedTitles) => TitleManager;
