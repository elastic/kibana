import { type ESQLCallbacks } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../commands/registry/types';
export declare function suggest(fullText: string, offset: number, resourceRetriever?: ESQLCallbacks): Promise<ISuggestionItem[]>;
