/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function createDeferred() {
  let resolver: any;
  let rejecter: any;

  function resolve(...args: any[]) {
    resolver(...args);
  }

  function reject(...args: any[]) {
    rejecter(...args);
  }

  const promise = new Promise((resolve_, reject_) => {
    resolver = resolve_;
    rejecter = reject_;
  });

  return { promise, resolve, reject };
}
