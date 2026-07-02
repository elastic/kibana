import * as t from 'io-ts';
export declare const LimitedSizeArray: <C extends t.Mixed>({ codec, minSize, maxSize, name, }: {
    codec: C;
    minSize?: number;
    maxSize?: number;
    name?: string;
}) => t.Type<t.TypeOf<C>[], t.TypeOf<C>[], unknown>;
