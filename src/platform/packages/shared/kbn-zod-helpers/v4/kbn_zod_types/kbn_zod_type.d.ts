export declare enum KbnZodTypes {
    BooleanFromString = "BooleanFromString",
    PassThroughAny = "PassThroughAny"
}
export interface KbnZodType {
    /**
     * The type name to identify the custom KbnZodType.
     */
    readonly kbnTypeName: KbnZodTypes;
}
