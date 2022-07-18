/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NotificationsStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { ExpressionsService, ExpressionRendererRegistry } from '../../common';

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getRenderersRegistry, setRenderersRegistry] =
  createGetterSetter<ExpressionRendererRegistry>('Renderers registry');

export const [getExpressionsService, setExpressionsService] =
  createGetterSetter<ExpressionsService>('ExpressionsService');

export * from './expressions_services';
