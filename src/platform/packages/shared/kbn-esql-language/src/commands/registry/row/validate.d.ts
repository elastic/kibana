import type { ESQLAstAllCommands, ESQLAst } from '@elastic/esql/types';
import type { ICommandContext, ICommandCallbacks } from '../types';
import type { ESQLMessage } from '../../definitions/types';
export declare const validate: (command: ESQLAstAllCommands, ast: ESQLAst, context?: ICommandContext, callbacks?: ICommandCallbacks) => ESQLMessage[];
