import type { ESQLCommand } from '@elastic/esql/types';
/**
 * Expands EVAL commands into separate single-expression EVAL commands.
 *
 * E.g. EVAL foo = 1, bar = 2 => [EVAL foo = 1, EVAL bar = 2]
 *
 * This is logically equivalent and makes validation and field existence detection much easier.
 *
 * @param commands The list of commands to expand.
 * @returns The expanded list of commands.
 */
export declare function expandEvals(commands: ESQLCommand[]): ESQLCommand[];
