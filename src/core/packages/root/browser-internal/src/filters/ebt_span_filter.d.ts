export type FilterFn = (payload: Payload) => Payload | boolean | void;
export interface Payload {
    transactions: Array<Record<string, any>>;
    errors: Array<Record<string, any>>;
    [key: string]: any;
}
export declare const ebtSpanFilter: FilterFn;
