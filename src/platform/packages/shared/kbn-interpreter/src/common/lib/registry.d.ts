export declare class Registry<ItemSpec, Item> {
    private readonly _prop;
    private _indexed;
    constructor(prop?: string);
    wrapper(obj: ItemSpec): Item;
    register(fn: () => ItemSpec): void;
    toJS(): {
        [key: string]: any;
    };
    toArray(): Item[];
    get(name: string): Item;
    getProp(): string;
    reset(): void;
}
