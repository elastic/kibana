import type { ESQLAstAllCommands, ESQLCommand } from '@elastic/esql/types';
import type { ICommandCallbacks, ICommandContext } from '../types';
import type { ESQLMessage } from '../../definitions/types';
export declare const validate: (command: ESQLAstAllCommands, _ast: ESQLCommand[], context?: ICommandContext, _callbacks?: ICommandCallbacks) => ESQLMessage[];
