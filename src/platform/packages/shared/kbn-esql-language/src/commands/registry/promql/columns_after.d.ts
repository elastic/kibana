import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import type { IAdditionalFields } from '../registry';
export declare const columnsAfter: (command: ESQLCommand, _previousColumns: ESQLColumnData[], query: string, { fromPromql }: IAdditionalFields) => Promise<ESQLColumnData[]>;
