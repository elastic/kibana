import { BehaviorSubject } from 'rxjs';
import type { TimeSlice } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Filter } from '@kbn/es-query';
import { type ESQLVariableType } from '@kbn/esql-types';
import type { ControlGroupCreationOptions, ControlPanelsState } from './types';
export declare const useChildrenApi: (state: ControlGroupCreationOptions["initialState"] | undefined, lastSavedState$Ref: React.MutableRefObject<BehaviorSubject<ControlPanelsState>>) => {
    childrenApi: {
        children$: BehaviorSubject<{
            [id: string]: DefaultEmbeddableApi<object>;
        }>;
        registerChildApi: (child: DefaultEmbeddableApi) => void;
        getChildApi: (uuid: string) => Promise<DefaultEmbeddableApi | undefined>;
        removeChild: (id: string) => void;
        setSerializedStateForChild: (id: string, childState: object) => void;
        getSerializedStateForChild: (id: string) => object;
        lastSavedStateForChild$: (id: string) => import("rxjs").Observable<object>;
        getLastSavedStateForChild: (id: string) => object;
        appliedFilters$: BehaviorSubject<Filter | undefined>;
        esqlVariables$: BehaviorSubject<ESQLVariableType[]>;
        appliedTimeslice$: BehaviorSubject<TimeSlice | undefined>;
    } | undefined;
    currentChildState$Ref: import("react").MutableRefObject<BehaviorSubject<{
        [id: string]: object;
    }>>;
};
