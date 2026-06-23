import type { ESQLAstAllCommands, ESQLCommand } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext } from '../types';
import type { ESQLMessage } from '../../definitions/types';
export declare const validate: (command: ESQLAstAllCommands, ast: ESQLCommand[], context?: ICommandContext, callbacks?: ICommandCallbacks) => ESQLMessage[];
