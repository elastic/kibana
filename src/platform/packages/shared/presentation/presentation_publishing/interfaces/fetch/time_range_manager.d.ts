import type { SerializedTimeRange } from '@kbn/presentation-publishing-schemas';
import type { StateManager } from '../../state_manager/types';
import type { StateComparators } from '../../state_manager';
export type { SerializedTimeRange } from '@kbn/presentation-publishing-schemas';
export declare const timeRangeComparators: StateComparators<SerializedTimeRange>;
export declare const initializeTimeRangeManager: (initialTimeRangeState: SerializedTimeRange) => StateManager<SerializedTimeRange>;
