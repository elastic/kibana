/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule } from 'inversify';
import type { CreateModuleFn } from '@kbn/core-di-common';

export const createModule: CreateModuleFn = (callback) => {
  return new ContainerModule(
    (bind, unbind, isBound, rebind, unbindAsync, onActivation, onDeactivation) => {
      callback({
        bind,
        unbind,
        isBound,
        rebind,
        unbindAsync,
        onActivation,
        onDeactivation,
      });
    }
  );
};
