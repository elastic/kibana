import { type StateComparators } from '../../../state_manager';
import type { HasParentApi } from '../../has_parent_api';
import type { HasSerializableState } from '../../has_serializable_state';
import type { HasUniqueId } from '../../has_uuid';
import type { PublishesUnsavedChanges } from '../../publishes_unsaved_changes';
export declare const UNSAVED_CHANGES_DEBOUNCE = 100;
export declare const initializeStateApi: <StateType extends object = object>({ uuid, applySerializedState, parentApi, getComparators, defaultState, serializeState, anyStateChange$, }: Omit<HasSerializableState<StateType>, 'latestState$'> & HasUniqueId & HasParentApi & {
    getComparators: () => StateComparators<StateType>;
    defaultState?: Partial<StateType>;
}) => PublishesUnsavedChanges & HasSerializableState<StateType>;
