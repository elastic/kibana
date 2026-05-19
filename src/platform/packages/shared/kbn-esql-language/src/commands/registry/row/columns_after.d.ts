import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../types';
export declare const columnsAfter: (command: ESQLCommand, _previousColumns: ESQLColumnData[], // will always be empty for ROW
query: string) => ESQLUserDefinedColumn[];
