import { type ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import type { IAdditionalFields } from '../registry';
export declare const columnsAfter: (command: ESQLCommand, _previousColumns: ESQLColumnData[], // will always be empty for TS
_query: string, additionalFields: IAdditionalFields) => Promise<import("@kbn/esql-types").ESQLFieldWithMetadata[]>;
