/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/** @public */
export type ConfigPath = string | string[];

/**
 * Checks whether specified value can be considered as config path.
 * @param value Value to check.
 * @public
 */
export function isConfigPath(value: unknown): value is ConfigPath {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    return true;
  }

  return Array.isArray(value) && value.every((segment) => typeof segment === 'string');
}

/**
 * Represents config store.
 * @internal
 */
export interface Config {
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

  /**
   * Returns a full copy of the underlying raw config object. Should be used ONLY
   * in extreme cases when there is no other better way, e.g. bridging with the
   * "legacy" systems that consume and process config in a different way.
   */
  toRaw(): Record<string, any>;
}

const pathDelimiter = '.';
export function hasConfigPathIntersection(leafPath: string, rootPath: string) {
  if (!leafPath) {
    throw new Error('leafPath cannot be empty');
  }
  if (!rootPath) {
    throw new Error('rootPath cannot be empty');
  }
  const leafSegments = leafPath.split(pathDelimiter);
  const rootSegments = rootPath.split(pathDelimiter);
  return rootSegments.every((rootSegment, index) => leafSegments[index] === rootSegment);
}
