/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { ExpressionsService, ExpressionRendererRegistry } from '../../common';
export declare const getNotifications: import('@kbn/kibana-utils-plugin/common').Get<NotificationsStart>;
export const setNotifications: import('@kbn/kibana-utils-plugin/common').Set<NotificationsStart>;
export declare const getRenderersRegistry: import('@kbn/kibana-utils-plugin/common').Get<ExpressionRendererRegistry>;
export const setRenderersRegistry: import('@kbn/kibana-utils-plugin/common').Set<ExpressionRendererRegistry>;
export declare const getExpressionsService: import('@kbn/kibana-utils-plugin/common').Get<ExpressionsService>;
export const setExpressionsService: import('@kbn/kibana-utils-plugin/common').Set<ExpressionsService>;
export * from './expressions_services';
