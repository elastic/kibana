import * as t from 'io-ts';
export declare const operatorIncluded: t.KeyofC<{
    included: null;
}>;
export declare const operatorExcluded: t.KeyofC<{
    excluded: null;
}>;
export declare const operator: t.KeyofC<{
    equals: null;
}>;
export type Operator = t.TypeOf<typeof operator>;
export declare enum OperatorEnum {
    EQUALS = "equals"
}
