import { type MapValueType } from '../../registry/complete_items';
export declare const MAP_PARAMS_REGEX: RegExp;
type ParsedMapParameter = Record<string, {
    type: MapValueType;
    rawType: string;
    description: string;
    values: string[];
}>;
export declare function getMapNestingLevel(text: string): number;
/**
 * Checks if the cursor is inside an unclosed map expression.
 */
export declare function isInsideMapExpression(text: string): boolean;
/**
 * Parses a mapParams definition string into ParsedMapParameter.
 *
 * Input:  "{name='boost', values=[2.5], description='Boost value', type=[float]}, {name='analyzer', values=[standard], description='analyzer used', type=[keyword]}"
 * Output: { boost: { type: 'number', ... }, analyzer: { type: 'string', ... } }
 */
export declare function parseMapParams(mapParamsStr: string): ParsedMapParameter;
export {};
