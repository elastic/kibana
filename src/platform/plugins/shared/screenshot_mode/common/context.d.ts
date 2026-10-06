/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type Context = Record<string, unknown>;
declare global {
  interface Window {
    __KBN_SCREENSHOT_CONTEXT__?: Context;
  }
}
/**
 * Stores a value in the screenshotting context.
 * @param key Context key to set.
 * @param value Value to set.
 */
export declare function setScreenshotContext<T = unknown>(key: string, value: T): void;
/**
 * Retrieves a value from the screenshotting context.
 * @param key Context key to get.
 * @param defaultValue Value to return if the key is not found.
 * @return The value stored in the screenshotting context.
 */
export declare function getScreenshotContext<T = unknown>(
  key: string,
  defaultValue?: T
): T | undefined;
export {};
