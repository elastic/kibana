/**
 * Alias for unknown raw field value, could be instance of a field Class
 */
export type RawValue = number | string | unknown;
/**
 * Class to extends that enabled serializing and deserializing instance values
 */
export declare abstract class SerializableField<S> {
    static isSerializable<T>(field: RawValue): field is SerializableField<T>;
    /**
     * Serializes the class instance to a known `SerializedValue` that can be used to instantiate a new instance
     *
     * Ideally this returns the same params as found in the constructor.
     */
    abstract serialize(): S;
    /**
     * typescript forbids abstract static methods but this is a workaround to require it
     *
     * @param serializedValue type of `SerializedValue`
     * @returns `instanceValue` should same type as instantiating class
     */
    static deserialize(serializedValue: unknown): unknown;
}
