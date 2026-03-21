export interface HasSerializableState<SerializedState extends object = object> {
    /**
     * Serializes all state into a format that can be saved into
     * some external store. The opposite of `deserialize` in the {@link ReactEmbeddableFactory}
     */
    serializeState: () => SerializedState;
}
export declare const apiHasSerializableState: (api: unknown | null) => api is HasSerializableState;
