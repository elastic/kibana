import type { Config, ConfigPath } from '..';
/**
 * Allows plain javascript object to behave like `RawConfig` instance.
 * @internal
 */
export declare class ObjectToConfigAdapter implements Config {
    private readonly rawConfig;
    constructor(rawConfig: Record<string, any>);
    has(configPath: ConfigPath): boolean;
    get(configPath: ConfigPath): any;
    set(configPath: ConfigPath, value: any): void;
    getFlattenedPaths(): string[];
    toRaw(): Record<string, any>;
}
