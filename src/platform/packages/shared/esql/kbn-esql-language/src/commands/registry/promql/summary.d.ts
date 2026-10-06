import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLCommandSummary } from '../..';
export declare const summary: (command: ESQLCommand, query: string) => ESQLCommandSummary;
