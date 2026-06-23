import type { ESQLAstAllCommands, ESQLCommand } from '@elastic/esql/types';
import type { ESQLMessage } from '../..';
export declare const validate: (command: ESQLAstAllCommands, commands: ESQLCommand[]) => ESQLMessage[];
