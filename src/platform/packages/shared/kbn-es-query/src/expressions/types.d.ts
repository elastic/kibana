import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Filter, Query, TimeRange } from '../filters';
import type { ProjectRouting } from '../project_routing';
export interface ExecutionContextSearch {
    now?: number;
    filters?: Filter[];
    query?: Query | Query[];
    timeRange?: TimeRange;
    disableWarningToasts?: boolean;
    esqlVariables?: ESQLControlVariable[];
    projectRouting?: ProjectRouting;
}
