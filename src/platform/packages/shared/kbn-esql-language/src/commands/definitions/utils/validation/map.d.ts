import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { ESQLMessage, SupportedDataType } from '../../..';
export declare const TypeMap: Record<SupportedDataType, string>;
export declare function validateMap(mapValue: ESQLSingleAstItem, mapDefinition: string): ESQLMessage | null;
