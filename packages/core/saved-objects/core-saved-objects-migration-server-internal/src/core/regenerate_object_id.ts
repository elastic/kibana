/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v5 as uuidv5 } from 'uuid';

/**
 * Deterministically regenerates a saved object's ID based upon it's current namespace, type, and ID. This ensures that we can regenerate
 * any existing object IDs without worrying about collisions if two objects that exist in different namespaces share an ID. It also ensures
 * that we can later regenerate any inbound object references to match.
 *
 * @note This is only intended to be used when single-namespace object types are converted into multi-namespace object types.
 * @internal
 */
export function deterministicallyRegenerateObjectId(namespace: string, type: string, id: string) {
  return uuidv5(`${namespace}:${type}:${id}`, uuidv5.DNS); // the uuidv5 namespace constant (uuidv5.DNS) is arbitrary
}
