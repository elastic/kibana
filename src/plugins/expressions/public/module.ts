/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContainerModule, interfaces } from 'inversify';
import type { NotificationsStart } from '@kbn/core/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { LoggerToken } from '../common/module';
import type { ExpressionLoader, IExpressionLoader } from './loader';
import type { ExpressionRenderHandler, IExpressionRenderer } from './render';

const ExpressionLoaderToken: interfaces.ServiceIdentifier<ExpressionLoader> =
  Symbol.for('ExpressionLoader');

const ExpressionLoaderModuleToken: interfaces.ServiceIdentifier<typeof import('./loader')> =
  Symbol.for('ExpressionLoaderModule');

export const ExpressionLoaderProviderToken: interfaces.ServiceIdentifier<IExpressionLoader> =
  Symbol.for('ExpressionLoaderProvider');

const ExpressionRenderHandlerModuleToken: interfaces.ServiceIdentifier<typeof import('./render')> =
  Symbol.for('ExpressionRenderHandlerModule');

const ExpressionRenderHandlerToken: interfaces.ServiceIdentifier<ExpressionRenderHandler> =
  Symbol.for('ExpressionRenderHandler');

export const ExpressionRenderHandlerProviderToken: interfaces.ServiceIdentifier<IExpressionRenderer> =
  Symbol.for('ExpressionRenderHandlerProvider');

export const NotificationsToken: interfaces.ServiceIdentifier<NotificationsStart> =
  Symbol.for('Notifications');

export function ExpressionsPublicModule() {
  return new ContainerModule((bind) => {
    bind(LoggerToken).toConstantValue({
      ...console,
      // eslint-disable-next-line no-console
      fatal: console.error,
      get() {
        return this;
      },
    });

    bind(ExpressionLoaderModuleToken)
      .toDynamicValue(() => import('./loader'))
      .inSingletonScope();
    bind(ExpressionLoaderToken)
      .toDynamicValue(async ({ container }) => {
        const { ExpressionLoader } = await container.getAsync(ExpressionLoaderModuleToken);
        const scope = container.createChild();
        scope.bind(ExpressionLoader).toSelf().inSingletonScope();

        return scope.get(ExpressionLoader);
      })
      .inRequestScope();
    bind(ExpressionLoaderProviderToken).toProvider(
      ({ container }): IExpressionLoader =>
        async (element, expression, params) => {
          const [
            { ExpressionToken, ExpressionLoaderParamsToken },
            { ElementToken, ExpressionRenderHandlerParamsToken, ExpressionRenderHandler },
          ] = await Promise.all([
            container.getAsync(ExpressionLoaderModuleToken),
            container.getAsync(ExpressionRenderHandlerModuleToken),
          ]);

          const scope = container.createChild();

          scope.bind(ExpressionRenderHandler).toSelf().inSingletonScope();
          scope.bind(ElementToken).toConstantValue(element);
          if (expression != null) {
            scope.bind(ExpressionToken).toConstantValue(expression);
          }
          if (params) {
            scope.bind(ExpressionLoaderParamsToken).toConstantValue(params);
            scope.bind(ExpressionRenderHandlerParamsToken).toService(ExpressionLoaderParamsToken);
          }

          return scope.getAsync(ExpressionLoaderToken);
        }
    );

    bind(ExpressionRenderHandlerModuleToken)
      .toDynamicValue(() => import('./render'))
      .inSingletonScope();
    bind(ExpressionRenderHandlerToken)
      .toDynamicValue(async ({ container }) => {
        const { ExpressionRenderHandler } = await container.getAsync(
          ExpressionRenderHandlerModuleToken
        );
        const scope = container.createChild();
        scope.bind(ExpressionRenderHandler).toSelf().inSingletonScope();

        return scope.get(ExpressionRenderHandler);
      })
      .inRequestScope();
    bind(ExpressionRenderHandlerProviderToken).toProvider(
      ({ container }): IExpressionRenderer =>
        async (element, data, params) => {
          const { ElementToken, ExpressionRenderHandlerParamsToken } = await container.getAsync(
            ExpressionRenderHandlerModuleToken
          );

          const scope = container.createChild();

          scope.bind(ElementToken).toConstantValue(element);
          if (params) {
            scope.bind(ExpressionRenderHandlerParamsToken).toConstantValue(params);
          }

          const handler = await scope.getAsync(ExpressionRenderHandlerToken);
          handler.render(data as SerializableRecord);

          return handler;
        }
    );
  });
}
