import type { ESQLAstHeaderCommand } from '@elastic/esql/types';
import { UnmappedFieldsStrategy, type ISuggestionItem } from '../../registry/types';
export declare function getSettingsCompletionItems(isServerless?: boolean): ISuggestionItem[];
/**
 * Checks the headers commmands looking for an unmapped_fields setting and returns its strategy value.
 * Default is DEFAULT.
 */
export declare function getUnmappedFieldsStrategy(headers?: ESQLAstHeaderCommand[]): UnmappedFieldsStrategy;
/**
 * Returns the type to be assigned to unmapped fields based on the provided strategy.
 */
export declare function getUnmappedFieldType(unmappedFieldsStrategy: UnmappedFieldsStrategy): string;
