/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Drilldown } from "./types";

const registry: {
  [key: string]: () => Promise<Drilldown>;
} = {};

export function registerDrilldown(
  type: string,
  getDrilldown: () => Promise<Drilldown>
) {
  if (registry[type]) {
    throw new Error(`Drilldown already registered for type "${type}".`);
  }

  registry[type] = getDrilldown;
}