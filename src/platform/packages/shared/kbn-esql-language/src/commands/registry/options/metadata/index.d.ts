import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ISuggestionItem } from '../../types';
export declare const METADATA_FIELDS: string[];
export declare const metadataSuggestion: ISuggestionItem;
export declare const getMetadataSuggestions: (command: ESQLAstAllCommands, queryText: string) => Promise<ISuggestionItem[]> | undefined;
