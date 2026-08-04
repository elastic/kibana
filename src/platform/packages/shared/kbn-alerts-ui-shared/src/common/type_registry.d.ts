interface BaseObjectType {
    id: string;
}
export declare class TypeRegistry<T extends BaseObjectType> {
    private readonly objectTypes;
    /**
     * Returns if the object type registry has the given type registered
     */
    has(id: string): boolean;
    /**
     * Registers an object type to the type registry
     */
    register(objectType: T): void;
    /**
     * Returns an object type, throw error if not registered
     */
    get(id: string): T;
    list(): T[];
}
export {};
