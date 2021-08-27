/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { NotificationsStart } from '../../../../core/public/notifications/notifications_service';
import { createGetterSetter } from '../../../kibana_utils/common/create_getter_setter';
import { ExpressionRendererRegistry } from '../../common/expression_renderers/expression_renderer_registry';
import { ExpressionsService } from '../../common/service/expressions_services';

export const [getNotifications, setNotifications] = createGetterSetter<NotificationsStart>(
  'Notifications'
);

export const [
  getRenderersRegistry,
  setRenderersRegistry,
] = createGetterSetter<ExpressionRendererRegistry>('Renderers registry');

export const [
  getExpressionsService,
  setExpressionsService,
] = createGetterSetter<ExpressionsService>('ExpressionsService');

export * from './expressions_services';
