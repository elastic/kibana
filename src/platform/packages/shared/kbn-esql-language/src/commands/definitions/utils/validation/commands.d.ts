import type { ESQLAst, ESQLAstAllCommands } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext } from '../../../registry/types';
import type { ESQLMessage } from '../../types';
export declare const validateCommandArguments: (command: ESQLAstAllCommands, ast: ESQLAst, context?: ICommandContext, callbacks?: ICommandCallbacks) => ESQLMessage[];
