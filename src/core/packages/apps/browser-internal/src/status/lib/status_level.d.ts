import type { ServiceStatusLevelId } from '@kbn/core-status-common';
import type { FormattedStatus, StatusState } from './load_status';
export declare const orderedLevels: ServiceStatusLevelId[];
export declare const groupByLevel: (statuses: FormattedStatus[]) => Map<ServiceStatusLevelId, FormattedStatus[]>;
export declare const getHighestStatus: (statuses: FormattedStatus[]) => Omit<StatusState, "message">;
export declare const getLevelSortValue: (status: FormattedStatus) => number;
