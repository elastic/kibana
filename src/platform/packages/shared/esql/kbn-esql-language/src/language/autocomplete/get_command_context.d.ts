import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ICommandContext } from '../../commands/registry/types';
export declare const getCommandContext: (command: ESQLAstAllCommands, queryString: string, callbacks?: ESQLCallbacks) => Promise<Partial<ICommandContext>>;
/**
 *  Returns the context needed by the functions used within a command.
 */
export declare const enhanceWithFunctionsContext: (command: ESQLAstAllCommands, context: Partial<ICommandContext>, callbacks?: ESQLCallbacks) => Promise<Partial<ICommandContext>>;
