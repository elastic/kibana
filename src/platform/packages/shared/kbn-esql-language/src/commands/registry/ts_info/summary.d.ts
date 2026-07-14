import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLCommandSummary } from '../types';
export declare const summary: (_command: ESQLCommand) => ESQLCommandSummary;
