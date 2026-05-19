import type { ESQLAst, ESQLAstAllCommands } from '@elastic/esql/types';
import type { ICommandContext } from '../types';
import type { ESQLMessage } from '../../definitions/types';
export declare const validate: (command: ESQLAstAllCommands, ast: ESQLAst, context?: ICommandContext) => ESQLMessage[];
