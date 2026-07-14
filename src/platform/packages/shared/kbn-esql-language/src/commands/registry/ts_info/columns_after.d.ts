import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
export declare const TS_INFO_FIELDS: ESQLColumnData[];
export declare const columnsAfter: (_command: ESQLCommand, previousColumns: ESQLColumnData[], _query: string) => ESQLColumnData[];
