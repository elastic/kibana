import * as t from 'io-ts';
export declare const NonEmptyArray: <C extends t.Mixed>(codec: C, name?: string) => t.Type<t.TypeOf<C>[], t.TypeOf<C>[], unknown>;
