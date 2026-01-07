/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PersistableState, PersistableStateDefinition } from "@kbn/kibana-utils-plugin/common";
import { SerializableRecord } from "@kbn/utility-types";
import { identity } from "lodash";

const registry = new Map<string, PersistableState>();

export function registerPersistableState(type: string, persistableState: PersistableStateDefinition) {
  if (registry.has(type)) {
    throw new Error(`Embeddable persistable state for type "${type}" is already registered.`);
  }
  registry.set(type, {
    telemetry: persistableState.telemetry || ((state, stats) => stats),
    inject: persistableState.inject || identity,
    extract: persistableState.extract || ((state: SerializableRecord) => ({ state, references: [] })),
    migrations: persistableState.migrations || {},
  });
};