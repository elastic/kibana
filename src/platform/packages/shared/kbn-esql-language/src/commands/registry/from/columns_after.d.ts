import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';
export declare const columnsAfter: (command: ESQLCommand, _previousColumns: ESQLColumnData[], // will always be empty for FROM
query: string, additionalFields: IAdditionalFields, unmappedFieldsStrategy?: UnmappedFieldsStrategy) => Promise<ESQLColumnData[]>;
