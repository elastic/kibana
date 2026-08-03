import { EventEmitter } from 'events';
type PersistedStateKey = string | string[] | undefined;
type PersistedStatePath = string | string[];
export declare class PersistedState extends EventEmitter {
    private readonly _path;
    private readonly _initialized;
    private _changedState;
    private _defaultState;
    private _mergedState;
    constructor(value?: any, path?: PersistedStatePath);
    get(key?: PersistedStateKey, defaultValue?: any): any;
    set(key: PersistedStateKey | any, value?: any): this;
    setSilent(key: PersistedStateKey | any, value?: any): this | undefined;
    clearAllKeys(): void;
    reset(path: PersistedStatePath): void;
    getChanges(): any;
    toJSON(): any;
    toString(): string;
    fromString(input: string): this;
    private getIndex;
    private getPartialIndex;
    private cleanPath;
    private getDefault;
    private setPath;
    private hasPath;
    private setValue;
}
export {};
