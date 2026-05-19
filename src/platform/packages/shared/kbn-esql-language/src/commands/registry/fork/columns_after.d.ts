import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { UnmappedFieldsStrategy } from '../types';
import type { IAdditionalFields } from '../registry';
export declare const columnsAfter: (command: ESQLAstAllCommands, previousColumns: ESQLColumnData[], query: string, additionalFields: IAdditionalFields, unmappedFieldsStrategy?: UnmappedFieldsStrategy) => Promise<ESQLColumnData[]>;
