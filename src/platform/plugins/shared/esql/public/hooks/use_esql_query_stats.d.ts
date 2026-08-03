import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { ESQLQueryStats } from '@kbn/esql-types';
export declare function useESQLQueryStats(isEsqlMode: boolean, requestAdapter?: RequestAdapter): ESQLQueryStats | undefined;
