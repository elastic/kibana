/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import { isPromise } from '@kbn/std';
import { Application, ApplicationParameters, CoreSetup, CoreStart } from '@kbn/core-di-browser';
import { Global, OnSetup } from '@kbn/core-di';

export const application = new ContainerModule(
  (bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
    onActivation(Application, ({ container }, definition) => {
      container.get(CoreSetup('application')).register({
        ...definition,
        mount(params) {
          const scope = container.get(CoreStart('injection')).fork();
          scope.bind(ApplicationParameters).toConstantValue(params);
          scope.bind(Global).toConstantValue(ApplicationParameters);
          const unmount = scope.get(definition).mount();

          return isPromise(unmount)
            ? unmount.finally(() => scope.unbindAll())
            : () => {
                try {
                  return unmount();
                } finally {
                  scope.unbindAll();
                }
              };
        },
      });

      return definition;
    });

    bind(OnSetup).toConstantValue((container) => {
      if (container.isCurrentBound(Application)) {
        container.getAll(Application);
      }
    });
  }
);
