/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type GetOrderedRolledFileFn = () => Promise<string[]>;
/**
 * Context shared between the rolling file manager, policy and strategy.
 */
export declare class RollingFileContext {
  #private;
  readonly filePath: string;
  constructor(filePath: string);
  /**
   * The size of the currently opened file.
   */
  currentFileSize: number;
  /**
   * The time the currently opened file was created.
   */
  currentFileTime: number;
  refreshFileInfo(): void;
  getOrderedRolledFiles(): Promise<string[]>;
  setOrderedRolledFileFn(fn: GetOrderedRolledFileFn): void;
}
