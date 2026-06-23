import type { Props, ObjectTypeOptions } from './object_type';
import { ObjectType } from './object_type';
export type IntersectionTypeOptions<T extends Props = any> = ObjectTypeOptions<T>;
export declare class IntersectionType<RTS extends Array<ObjectType<any>>, T extends Props> extends ObjectType<T> {
    constructor(types: RTS, options?: IntersectionTypeOptions<T>);
}
