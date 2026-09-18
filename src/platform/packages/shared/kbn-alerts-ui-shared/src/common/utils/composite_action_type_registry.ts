/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeModel, ActionTypeRegistryContract } from '../types';

export function createCompositeActionTypeRegistry(
  base: ActionTypeRegistryContract,
  overlay: ActionTypeModel[]
): ActionTypeRegistryContract {
  const overlayById = new Map(overlay.map((model) => [model.id, model]));

  return {
    has: (id: string) => overlayById.has(id) || base.has(id),
    get: (id: string) => {
      const overlayModel = overlayById.get(id);
      if (overlayModel) {
        return overlayModel;
      }
      return base.get(id);
    },
    list: () => [...base.list(), ...overlay],
    register: (model) => base.register(model),
  };
}
