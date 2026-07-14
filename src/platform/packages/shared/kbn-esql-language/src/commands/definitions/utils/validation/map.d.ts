import type { ESQLMap, ESQLSingleAstItem } from '@elastic/esql/types';
import type { ESQLMessage, SupportedDataType } from '../../..';
import { UnmappedFieldsStrategy, type ESQLColumnData } from '../../../registry/types';
export declare const TypeMap: Record<SupportedDataType, string>;
export declare function validateMap(mapValue: ESQLSingleAstItem, mapDefinition: string): ESQLMessage | null;
/**
 * Enforces list shape for map parameters whose item type is validated by validateMap.
 */
export declare const validateMapListParameter: (mapValue: ESQLMap, paramName: string, columns?: Map<string, ESQLColumnData>, unmappedFieldsStrategy?: UnmappedFieldsStrategy) => ESQLMessage | null;
