/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardI18nService } from './types';

export type I18nServiceFactory = KibanaPluginServiceFactory<
  DashboardI18nService,
  DashboardStartDependencies
>;
export const i18nServiceFactory: I18nServiceFactory = ({ coreStart }) => {
  const { i18n } = coreStart;

  return i18n;
};
