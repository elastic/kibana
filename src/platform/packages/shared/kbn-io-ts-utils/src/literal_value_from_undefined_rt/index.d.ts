import * as rt from 'io-ts';
export declare const createLiteralValueFromUndefinedRT: <LiteralValue extends string | number | boolean>(literalValue: LiteralValue) => rt.Type<LiteralValue, undefined, unknown>;
