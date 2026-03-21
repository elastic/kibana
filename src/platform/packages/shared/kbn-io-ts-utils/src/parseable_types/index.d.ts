import type * as t from 'io-ts';
import type { MergeType } from '../merge_rt';
export type ParseableType = t.StringType | t.NumberType | t.BooleanType | t.ArrayType<t.Mixed> | t.RecordC<t.Mixed, t.Mixed> | t.DictionaryType<t.Mixed, t.Mixed> | t.InterfaceType<t.Props> | t.PartialType<t.Props> | t.UnionType<t.Mixed[]> | t.IntersectionType<t.Mixed[]> | MergeType<t.Mixed, t.Mixed>;
export declare const isParsableType: (type: t.Type<any> | ParseableType) => type is ParseableType;
