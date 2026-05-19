import type { BehaviorSubject } from 'rxjs';
import type { DataMsg } from '../state_management/discover_data_state_container';
export declare function useDataState<T extends DataMsg>(data$: BehaviorSubject<T>): T;
