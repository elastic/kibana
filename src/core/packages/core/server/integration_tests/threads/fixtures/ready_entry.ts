/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Node strips TypeScript types natively but rejects enums, so only the swc require hook
// installed by the bootstrap can load this entry.
enum KeepAlive {
  IntervalMs = 1_000,
}

// The ref'd interval keeps the worker alive, as a real entry's poll loop would.
const keepAlive: NodeJS.Timeout = setInterval(() => {}, KeepAlive.IntervalMs);

export { keepAlive };
