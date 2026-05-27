import type { HasSerializableState } from '../../has_serializable_state';
import type { PublishesUnsavedChanges } from '../../publishes_unsaved_changes';
import { type StateComparators } from '../../../state_manager';
import type { HasUniqueId } from '../../has_uuid';
import type { HasParentApi } from '../../has_parent_api';
export declare const initializeStateApi: <StateType extends object = object>({ uuid, applySerializedState, parentApi, getComparators, defaultState, serializeState, anyStateChange$, }: HasSerializableState<StateType> & HasUniqueId & HasParentApi & {
    getComparators: () => StateComparators<StateType>;
    defaultState?: Partial<StateType>;
}) => PublishesUnsavedChanges & HasSerializableState<StateType>;
