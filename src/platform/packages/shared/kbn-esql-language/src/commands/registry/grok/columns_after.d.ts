import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
export declare const columnsAfter: (command: ESQLCommand, previousColumns: ESQLColumnData[], _query: string) => ESQLColumnData[];
