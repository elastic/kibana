export type Get<T> = () => T;
export type Set<T> = (value: T) => void;
export declare const createGetterSetter: <T extends object>(name: string, isValueRequired?: boolean) => [Get<T>, Set<T>];
