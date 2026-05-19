/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Returns execArgv entries that forward the parent's --inspect/--inspect-brk
 * flag to a worker process with an auto-incremented port.
 *
 * Returns an empty array when:
 * - `inspectWorkers` is false
 * - the parent process is not being inspected
 */
export declare function getInspectExecArgv(inspectWorkers: boolean): string[];
/**
 * Reset internal state — only for testing.
 */
export declare function resetInspectState(): void;
