import type { ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
import { type ICommandContext } from '../../../registry/types';
import type { ESQLMessage } from '../../types';
export declare function validateColumnForCommand(column: ESQLColumn | ESQLIdentifier, commandName: string, context: ICommandContext): ESQLMessage[];
export declare class ColumnValidator {
    private readonly column;
    private readonly context;
    private readonly commandName;
    constructor(column: ESQLColumn | ESQLIdentifier, context: ICommandContext, commandName: string);
    validate(): ESQLMessage[];
    private get exists();
    private get isUnmappedColumnAllowed();
    private get isPreviouslyUsedUnmappedColumn();
}
