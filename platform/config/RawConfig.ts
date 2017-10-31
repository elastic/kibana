import { ConfigPath } from './ConfigService';

/**
 * Represents raw config store.
 */
export interface RawConfig {
  /**
   * Returns whether or not there is a config value located at the specified path.
   * @param configPath Path to locate value at.
   * @returns Whether or not a value exists at the path.
   */
  has(configPath: ConfigPath): boolean;

  /**
   * Returns config value located at the specified path.
   * @param configPath Path to locate value at.
   * @returns Config value.
   */
  get(configPath: ConfigPath): any;

  /**
   * Sets config value at the specified path.
   * @param configPath Path to set value for.
   * @param value Value to set for the specified path.
   */
  set(configPath: ConfigPath, value: any): void;

  /**
   * Returns full flattened list of the config paths that config contains.
   * @returns List of the string config paths.
   */
  getFlattenedPaths(): string[];
}
