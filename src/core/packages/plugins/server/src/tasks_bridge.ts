/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Lets a plugin's `server/tasks` entry reuse what the plugin's `server` entry already built when
 * both run in the same process (Kibana), and build its own when only the tasks entry runs (a task
 * pod). Stateful plugins (registries, services) need this: a second instance in Kibana would
 * register the same types twice, or hold different state than the one the rest of Kibana uses.
 *
 * The `server` entry publishes its contracts with `setSetup`/`setStart`; the tasks entry asks with
 * `getSetup`/`getStart` and builds a standalone implementation when they are `undefined`.
 *
 * @public
 */
export interface TasksKibanaBridge<TSetup, TStart> {
  setSetup(contract: TSetup): void;
  setStart(contract: TStart): void;
  getSetup(): TSetup | undefined;
  getStart(): TStart | undefined;
}

/** @public */
export const createTasksKibanaBridge = <TSetup = unknown, TStart = unknown>(): TasksKibanaBridge<
  TSetup,
  TStart
> => {
  let setup: TSetup | undefined;
  let start: TStart | undefined;
  return {
    setSetup: (contract) => {
      setup = contract;
    },
    setStart: (contract) => {
      start = contract;
    },
    getSetup: () => setup,
    getStart: () => start,
  };
};
