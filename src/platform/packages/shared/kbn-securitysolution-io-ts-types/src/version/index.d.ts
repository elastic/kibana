import * as t from 'io-ts';
/**
 * Note this is just a positive number, but we use it as a type here which is still ok.
 * This type was originally from "x-pack/solutions/security/plugins/security_solution/common/detection_engine/schemas/common/schemas.ts"
 * but is moved here to make things more portable. No unit tests, but see PositiveIntegerGreaterThanZero integer for unit tests.
 */
export declare const version: t.Type<number, number, unknown>;
export type Version = t.TypeOf<typeof version>;
export declare const versionOrUndefined: t.UnionC<[t.Type<number, number, unknown>, t.UndefinedC]>;
export type VersionOrUndefined = t.TypeOf<typeof versionOrUndefined>;
