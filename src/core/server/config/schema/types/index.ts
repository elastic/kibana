export { Type, TypeOptions } from './type';
export { BooleanType } from './boolean_type';
export { StringOptions, StringType } from './string_type';
export { NumberOptions, NumberType } from './number_type';
export { ByteSizeOptions, ByteSizeType } from './byte_size_type';
export { LiteralType } from './literal_type';
export { AnyType } from './any_type';
export { DurationOptions, DurationType } from './duration_type';
export { MaybeType } from './maybe_type';
export { ObjectType, Props, TypeOf } from './object_type';
export { ArrayOptions, ArrayType } from './array_type';
export { MapOfOptions, MapOfType } from './map_type';
export { UnionType } from './union_type';

export function toContext(parent: string = '', child: string | number) {
  return parent ? `${parent}.${child}` : String(child);
}
