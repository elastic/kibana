import type { FieldToValueMap } from '../types';
export declare function cronExpressionToParts(expression: string): FieldToValueMap;
export declare function cronPartsToExpression({ second, minute, hour, day, date, month, }: FieldToValueMap): string;
