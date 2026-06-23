import type { ESQLCommand } from '@elastic/esql/types';
import type { SupportedDataType } from '../../definitions/types';
import type { ESQLColumnData } from '../types';
export declare const URI_PARTS_COLUMNS: Array<{
    suffix: string;
    type: SupportedDataType;
}>;
export declare const columnsAfter: (command: ESQLCommand, previousColumns: ESQLColumnData[]) => ESQLColumnData[];
