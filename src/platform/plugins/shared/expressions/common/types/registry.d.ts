export interface IRegistry<T> {
    get(id: string): T | null;
    toJS(): Record<string, T>;
    toArray(): T[];
}
