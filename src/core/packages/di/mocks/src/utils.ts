/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Container, ServiceIdentifier } from 'inversify';
import { OnReady, OnSetup, OnStart } from '@kbn/core-di';
import { Collect } from '@kbn/core-di-internal';

function run(hook: ServiceIdentifier<(container: Container) => void>, container: Container): void {
  return container.getAll(hook, { chained: true, optional: true }).forEach((fn) => fn(container));
}

/** Runs the container's setup hooks. */
export function setup(container: Container): void {
  run(OnSetup, container);
}

/** Runs the container's start hooks. */
export function start(container: Container): void {
  run(OnStart, container);
}

/** Runs the container's `collect` handlers, then its `OnReady` hooks. */
export function ready(container: Container): void {
  run(Collect, container);
  run(OnReady, container);
}
