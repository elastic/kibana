import type { Observable } from 'rxjs';
import type { MaybePromise } from '@kbn/utility-types';
import type { HasSerializableState } from '../../has_serializable_state';
import type { PublishesUnsavedChanges } from '../../publishes_unsaved_changes';
import { type StateComparators } from '../../../state_manager';
export declare const initializeUnsavedChanges: <StateType extends object = object>({ uuid, onReset, parentApi, getComparators, defaultState, serializeState, anyStateChange$, checkRefEquality, }: {
    uuid: string;
    parentApi: unknown;
    anyStateChange$: Observable<void>;
    serializeState: () => StateType;
    getComparators: () => StateComparators<StateType>;
    defaultState?: Partial<StateType>;
    onReset?: (lastSavedPanelState?: StateType) => MaybePromise<void>;
    checkRefEquality?: boolean;
}) => PublishesUnsavedChanges & Pick<HasSerializableState<StateType>, "applySerializedState">;
