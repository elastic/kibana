/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/** @public */
export type ConfigPath = string | string[];

/**
 * Checks whether specified value can be considered as config path.
 * @param value Value to check.
 * @internal
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
