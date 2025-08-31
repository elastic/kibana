/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { isPromise } from '@kbn/std';
import type { AppUnmount } from '@kbn/core-application-browser';
import { Application, ApplicationParameters, CoreSetup, CoreStart } from '@kbn/core-di-browser';
import { Global } from '@kbn/core-di-internal';
import { OnSetup } from '@kbn/core-di';

export function loadApplication({ bind, onActivation }: ContainerModuleLoadOptions) {
  onActivation(Application, ({ get }, definition) => {
    get(CoreSetup('application')).register({
      ...definition,
      mount(params) {
        const scope = get(CoreStart('injection')).fork();
        scope.bind(ApplicationParameters).toConstantValue(params);
        scope.bind(Global).toConstantValue(ApplicationParameters);
        const unmount = scope.get(definition, { autobind: true }).mount();
        const wrap = (callback: AppUnmount) => () => {
          try {
            return callback();
          } finally {
            scope.unbindAll();
          }
        };

        return isPromise(unmount) ? unmount.then(wrap) : wrap(unmount);
      },
    });

    return definition;
  });

  bind(OnSetup).toConstantValue((container) => {
    container.getAll(Application);
  });
}
