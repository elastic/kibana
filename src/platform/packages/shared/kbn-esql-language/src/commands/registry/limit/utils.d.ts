import type { ESQLAstAllCommands, ESQLCommandOption } from '@elastic/esql/types';
export type LimitCaretPosition = 'after_limit_keyword' | 'after_value' | 'grouping_expression';
export declare function getPosition(command: ESQLAstAllCommands, innerText: string): LimitCaretPosition;
export declare function getByOption(command: ESQLAstAllCommands): ESQLCommandOption | undefined;
export declare function getByColumns(byNode: ESQLCommandOption | undefined): string[];
