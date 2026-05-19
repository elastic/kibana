interface Obj {
    [key: PropertyKey]: Obj | unknown;
}
type DeepPartial<TInputObj> = {
    [Prop in keyof TInputObj]?: TInputObj[Prop] extends Obj ? DeepPartial<TInputObj[Prop]> : TInputObj[Prop];
};
interface ObjectDiffResult<TBase, TCompare> {
    added: DeepPartial<TCompare>;
    removed: DeepPartial<TBase>;
    updated: {
        [K in keyof TBase & keyof TCompare]?: TBase[K] extends TCompare[K] ? never : TCompare[K];
    };
}
/**
 * Compares two JSON objects and calculates the added and removed properties, including nested properties.
 * @param oldObj - The base object.
 * @param newObj - The comparison object.
 * @returns An object containing added and removed properties.
 */
export declare function calculateObjectDiff<TBase extends Obj, TCompare extends Obj>(oldObj: TBase, newObj?: TCompare): ObjectDiffResult<TBase, TCompare>;
export {};
