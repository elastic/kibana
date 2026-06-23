import type { ESQLAst, ESQLAstAllCommands, ESQLCommandOption } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext } from '../../../registry/types';
import type { ESQLMessage } from '../../types';
export declare function validateOption(option: ESQLCommandOption, command: ESQLAstAllCommands, ast: ESQLAst, context: ICommandContext, callbacks: ICommandCallbacks): ESQLMessage[];
