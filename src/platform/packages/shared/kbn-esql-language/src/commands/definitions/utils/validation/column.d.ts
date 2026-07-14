import type { ESQLColumn, ESQLIdentifier, ESQLSingleAstItem } from '@elastic/esql/types';
import { type ICommandContext } from '../../../registry/types';
import type { ESQLMessage } from '../../types';
interface ColumnValidationOptions {
    skipUnsupportedOrConflictingColumnValidation?: boolean;
}
export declare function validateColumnForCommand(column: ESQLColumn | ESQLIdentifier, commandName: string, context: ICommandContext, options?: ColumnValidationOptions): ESQLMessage[];
export declare class ColumnValidator {
    private readonly column;
    private readonly context;
    private readonly commandName;
    private readonly options;
    constructor(column: ESQLColumn | ESQLIdentifier, context: ICommandContext, commandName: string, options?: ColumnValidationOptions);
    validate(): ESQLMessage[];
    private get exists();
    private get isUnmappedColumnAllowed();
    private get isPreviouslyUsedUnmappedColumn();
    private get shouldWarnForUnsupportedOrConflictingColumn();
}
export declare const validatePrefixAssignmentExpression: ({ expression, commandName, acceptedTypes, typeLabel, context, }: {
    expression: ESQLSingleAstItem | undefined;
    commandName: string;
    acceptedTypes: readonly string[];
    typeLabel: string;
    context?: ICommandContext;
}) => ESQLMessage[];
export {};
