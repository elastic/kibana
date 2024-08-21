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
import {
  Application,
  ApplicationService,
  AppMountParametersToken,
  IAppMount,
} from '@kbn/core-application-browser';
import { DiService, Global, OnSetup } from '@kbn/core-di-common';

export const applicationModule = new ContainerModule(
  (bind, _unbind, _isBound, _rebind, _unbindAsync, onActivation) => {
    onActivation(Application, ({ container }, application) => {
      container.get(ApplicationService).register({
        ...application,
        mount(params) {
          const scope = container.get(DiService).fork();
          scope.bind(AppMountParametersToken).toConstantValue(params);
          scope.bind(Global).toConstantValue(AppMountParametersToken);
          const unmount = scope.get<IAppMount>(application).mount();

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

      return application;
    });

    bind(OnSetup).toConstantValue((container) => {
      if (container.isCurrentBound(Application)) {
        container.getAll(Application);
      }
    });
  }
);
