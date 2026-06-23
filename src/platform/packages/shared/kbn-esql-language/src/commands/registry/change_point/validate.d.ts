import type { ESQLAst, ESQLAstAllCommands } from '@elastic/esql/types';
import type { ESQLMessage } from '../../definitions/types';
import type { ICommandContext, ICommandCallbacks } from '../types';
export declare const validate: (command: ESQLAstAllCommands, ast: ESQLAst, context?: ICommandContext, callbacks?: ICommandCallbacks) => ESQLMessage[];
