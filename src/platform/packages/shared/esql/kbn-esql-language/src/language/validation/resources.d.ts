import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ESQLPolicy } from '../../commands/registry/types';
export declare function retrievePolicies(commands: ESQLAstAllCommands[], callbacks?: ESQLCallbacks): Promise<Map<string, ESQLPolicy>>;
export declare function retrieveSources(commands: ESQLAstAllCommands[], callbacks?: ESQLCallbacks): Promise<Set<string>>;
