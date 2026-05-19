import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
export declare const METRICS_INFO_COLUMNS: ESQLColumnData[];
export declare const columnsAfter: (_command: ESQLCommand, previousColumns: ESQLColumnData[], _query: string) => ESQLColumnData[];
