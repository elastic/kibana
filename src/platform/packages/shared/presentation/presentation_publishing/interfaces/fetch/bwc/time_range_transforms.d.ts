import type { SerializedTimeRange } from '@kbn/presentation-publishing-schemas';
/**
 * Pre 9.4 the time_range state was stored in a camelCased key called timeRange.
 * This transform out function ensures that this state is not dropped when loading from
 * a legacy stored state. This should only be used for embeddables that existed before 9.4.
 */
export declare const transformTimeRangeOut: <StoredStateType extends SerializedTimeRange & Record<string, unknown>>(storedState: StoredStateType) => StoredStateType;
